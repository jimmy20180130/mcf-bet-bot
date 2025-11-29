class LMDBManager {
    constructor() {
        this.currentEditKey = null;
        this.currentSearchQuery = '';
        this.currentPrefix = '';
        this.currentPage = 1;
        this.pageSize = 30;
        this.totalPages = 0;
        this.monacoEditor = null;
        this.scrollPosition = 0;
        this.init();
    }

    async init() {
        await this.initMonaco();
        this.bindEvents();
        try {
            await this.loadPrefixes();
            await this.loadData();
            await this.loadStats();
        } catch (error) {
            console.error('初始化載入失敗:', error);
            this.showNotification('初始化失敗', 'error');
        }
    }

    async initMonaco() {
        return new Promise((resolve) => {
            require.config({ 
                paths: { 
                    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
                } 
            });
            
            require(['vs/editor/editor.main'], () => {
                console.log('Monaco Editor 已載入');
                resolve();
            });
        });
    }

    bindEvents() {
        // 搜尋功能
        document.getElementById('search-btn').addEventListener('click', async () => await this.searchData());
        document.getElementById('search-input').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') await this.searchData();
        });

        // 操作按鈕
        document.getElementById('add-btn').addEventListener('click', () => this.showAddModal());
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClearDatabase());
        document.getElementById('refresh-btn').addEventListener('click', async () => {
            try {
                console.log('刷新按鈕被點擊');
                await this.refreshData();
                this.showNotification('資料已刷新', 'success');
            } catch (error) {
                console.error('刷新按鈕錯誤:', error);
                this.showNotification('刷新失敗', 'error');
            }
        });

        // 模態框
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModal());
        });
        
        document.getElementById('cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('data-form').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // 確認刪除模態框
        document.getElementById('cancel-delete').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-delete').addEventListener('click', () => this.performDelete());

        // 點擊模態框外部關閉
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            const confirmModal = document.getElementById('confirm-modal');
            if (e.target === modal) this.closeModal();
            if (e.target === confirmModal) this.closeConfirmModal();
        });
    }

    async loadPrefixes() {
        try {
            const response = await fetch('/api/prefixes');
            const result = await response.json();
            
            if (result.success) {
                const prefixList = document.getElementById('prefix-list');
                prefixList.innerHTML = result.prefixes.map(prefix => `
                    <div class="prefix-item" data-prefix="${prefix}" onclick="lmdbManager.selectPrefix('${this.escapeHtml(prefix)}')">
                        <i class="fas fa-folder"></i>
                        <span>${this.escapeHtml(prefix)}</span>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('載入 prefix 列表錯誤:', error);
        }
    }

    selectPrefix(prefix) {
        this.currentPrefix = prefix;
        this.currentPage = 1;
        this.currentSearchQuery = '';
        document.getElementById('search-input').value = '';
        
        // 更新側邊欄選中狀態
        document.querySelectorAll('.prefix-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.prefix === prefix) {
                item.classList.add('active');
            }
        });
        
        this.loadData();
    }

    async loadData(query = '') {
        // 儲存滾動位置
        const dataList = document.getElementById('data-list');
        this.scrollPosition = dataList.scrollTop;
        
        // 顯示載入狀態
        this.showLoading(true, '載入中...');
        
        try {
            let endpoint;
            if (query) {
                endpoint = `/api/search/${encodeURIComponent(query)}`;
            } else {
                const params = new URLSearchParams({
                    prefix: this.currentPrefix,
                    page: this.currentPage,
                    pageSize: this.pageSize
                });
                endpoint = `/api/keys?${params}`;
            }
            
            const response = await fetch(endpoint);
            const result = await response.json();
            
            if (result.success) {
                if (query) {
                    // 搜尋結果不使用分頁
                    await this.displayData(result.keys);
                    this.renderPagination(1, 1, result.keys.length);
                } else {
                    await this.displayData(result.keys);
                    const { page, totalPages, total } = result.pagination;
                    this.totalPages = totalPages;
                    this.renderPagination(page, totalPages, total);
                }
            } else {
                this.showNotification('載入資料失敗: ' + result.error, 'error');
                dataList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>載入失敗</h3><p>' + result.error + '</p></div>';
            }
        } catch (error) {
            console.error('載入資料錯誤:', error);
            this.showNotification('載入資料失敗', 'error');
            dataList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>載入失敗</h3><p>網路錯誤或伺服器無回應</p></div>';
        }
    }

    async displayData(keys) {
        const dataList = document.getElementById('data-list');
        
        // 清空所有現有內容
        dataList.innerHTML = '';
        
        if (keys.length === 0) {
            dataList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>沒有找到資料</h3>
                    <p>資料庫是空的或沒有符合搜尋條件的資料</p>
                </div>
            `;
            return;
        }

        const dataItems = await Promise.all(keys.map(async (key) => {
            try {
                const response = await fetch(`/api/data/${encodeURIComponent(key)}`);
                const result = await response.json();
                const value = result.success ? result.data : '無法載入';
                const preview = this.formatPreview(value);
                
                return `
                    <div class="data-item">
                        <div class="data-item-header">
                            <span class="data-key">${this.escapeHtml(key)}</span>
                            <div class="data-actions">
                                <button class="btn btn-primary btn-small" onclick="lmdbManager.editData('${this.escapeHtml(key)}')">
                                    <i class="fas fa-edit"></i> 編輯
                                </button>
                                <button class="btn btn-danger btn-small" onclick="lmdbManager.confirmDelete('${this.escapeHtml(key)}')">
                                    <i class="fas fa-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                        <div class="data-preview">${preview}</div>
                    </div>
                `;
            } catch (error) {
                return `
                    <div class="data-item">
                        <div class="data-item-header">
                            <span class="data-key">${this.escapeHtml(key)}</span>
                            <div class="data-actions">
                                <button class="btn btn-danger btn-small" onclick="lmdbManager.confirmDelete('${this.escapeHtml(key)}')">
                                    <i class="fas fa-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                        <div class="data-preview">載入錯誤</div>
                    </div>
                `;
            }
        }));

        dataList.innerHTML = dataItems.join('');
        
        // 恢復滾動位置
        setTimeout(() => {
            dataList.scrollTop = this.scrollPosition;
        }, 0);
    }

    renderPagination(currentPage, totalPages, totalItems) {
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-info">共 ' + totalItems + ' 筆資料</div>';
        
        // 上一頁按鈕
        html += `<button onclick="lmdbManager.goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> 上一頁
        </button>`;
        
        // 頁碼按鈕
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        if (startPage > 1) {
            html += `<button class="page-number" onclick="lmdbManager.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += '<span>...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="lmdbManager.goToPage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<span>...</span>';
            }
            html += `<button class="page-number" onclick="lmdbManager.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // 下一頁按鈕
        html += `<button onclick="lmdbManager.goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            下一頁 <i class="fas fa-chevron-right"></i>
        </button>`;
        
        pagination.innerHTML = html;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.scrollPosition = 0; // 換頁時重置滾動位置
        this.loadData(this.currentSearchQuery);
    }

    formatPreview(value) {
        try {
            if (typeof value === 'object' && value !== null) {
                return this.escapeHtml(JSON.stringify(value, null, 2));
            }
            return this.escapeHtml(String(value));
        } catch (error) {
            return this.escapeHtml(String(value));
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('total-keys').textContent = `總鍵值: ${result.stats.totalKeys}`;
            } else {
                document.getElementById('total-keys').textContent = '總鍵值: 無法載入';
            }
        } catch (error) {
            console.error('載入統計資料錯誤:', error);
            document.getElementById('total-keys').textContent = '總鍵值: 載入失敗';
        }
    }

    showLoading(show, message = '載入中...') {
        const dataList = document.getElementById('data-list');
        if (show) {
            dataList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> ' + message + '</div>';
        }
    }

    async refreshData() {
        console.log('開始重新載入資料...');
        
        try {
            await this.loadPrefixes();
            await this.loadData(this.currentSearchQuery);
            await this.loadStats();
            console.log('資料已重新載入');
        } catch (error) {
            console.error('重新載入資料時發生錯誤:', error);
            this.showNotification('重新載入失敗', 'error');
        }
    }

    async searchData() {
        const query = document.getElementById('search-input').value.trim();
        this.currentSearchQuery = query;
        this.currentPage = 1;
        this.scrollPosition = 0;
        
        console.log('開始搜尋:', query || '(顯示所有資料)');
        
        try {
            await this.loadData(query);
            await this.loadStats();
            console.log('搜尋完成');
        } catch (error) {
            console.error('搜尋時發生錯誤:', error);
            this.showNotification('搜尋失敗', 'error');
        }
    }

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modal-title').textContent = '新增資料';
        document.getElementById('key-input').value = '';
        document.getElementById('key-input').disabled = false;
        
        // 初始化 Monaco Editor
        if (!this.monacoEditor) {
            this.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
                value: '',
                language: 'json',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on'
            });
        } else {
            this.monacoEditor.setValue('');
        }
        
        document.getElementById('modal').style.display = 'block';
    }

    async editData(key) {
        this.currentEditKey = key;
        document.getElementById('modal-title').textContent = '編輯資料';
        document.getElementById('key-input').value = key;
        document.getElementById('key-input').disabled = true;
        
        try {
            const response = await fetch(`/api/data/${encodeURIComponent(key)}`);
            const result = await response.json();
            
            if (result.success) {
                const value = typeof result.data === 'object' ? 
                    JSON.stringify(result.data, null, 2) : 
                    String(result.data);
                
                // 初始化 Monaco Editor
                if (!this.monacoEditor) {
                    this.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
                        value: value,
                        language: 'json',
                        theme: 'vs-dark',
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on'
                    });
                } else {
                    this.monacoEditor.setValue(value);
                }
            } else {
                this.showNotification('載入資料失敗', 'error');
                return;
            }
        } catch (error) {
            this.showNotification('載入資料失敗', 'error');
            return;
        }
        
        document.getElementById('modal').style.display = 'block';
    }

    confirmDelete(key) {
        document.getElementById('delete-key').textContent = key;
        document.getElementById('confirm-modal').style.display = 'block';
    }

    async performDelete() {
        const key = document.getElementById('delete-key').textContent;
        
        try {
            const response = await fetch(`/api/data/${encodeURIComponent(key)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('資料刪除成功', 'success');
                await this.refreshData();
            } else {
                this.showNotification('刪除失敗: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('刪除失敗', 'error');
        }
        
        this.closeConfirmModal();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const key = document.getElementById('key-input').value.trim();
        const valueText = this.monacoEditor ? this.monacoEditor.getValue().trim() : '';
        
        if (!key) {
            this.showNotification('鍵值不能為空', 'error');
            return;
        }

        let value;
        try {
            value = JSON.parse(valueText);
        } catch {
            value = valueText;
        }

        const isEdit = this.currentEditKey !== null;
        const method = isEdit ? 'PUT' : 'POST';
        const endpoint = isEdit ? `/api/data/${encodeURIComponent(key)}` : '/api/data';

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key, value })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(isEdit ? '資料更新成功' : '資料創建成功', 'success');
                this.closeModal();
                await this.refreshData();
            } else {
                this.showNotification((isEdit ? '更新' : '創建') + '失敗: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification((isEdit ? '更新' : '創建') + '失敗', 'error');
        }
    }

    confirmClearDatabase() {
        if (confirm('確定要清空整個資料庫嗎？此操作無法復原！')) {
            this.clearDatabase();
        }
    }

    async clearDatabase() {
        try {
            const response = await fetch('/api/clear', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('資料庫清空成功', 'success');
                this.currentPrefix = '';
                this.currentPage = 1;
                this.scrollPosition = 0;
                await this.refreshData();
            } else {
                this.showNotification('清空失敗: ' + result.error, 'error');
            }
        } catch (error) {
            this.showNotification('清空失敗', 'error');
        }
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
        this.currentEditKey = null;
        if (this.monacoEditor) {
            this.monacoEditor.dispose();
            this.monacoEditor = null;
        }
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification ' + type + ' show';
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 初始化管理器
const lmdbManager = new LMDBManager();