class LMDBManager {
    constructor() {
        this.currentEditKey = null;
        this.currentSearchQuery = '';
        this.init();
    }

    async init() {
        this.bindEvents();
        try {
            await this.loadData();
            await this.loadStats();
        } catch (error) {
            console.error('初始化載入失敗:', error);
            this.showNotification('初始化失敗', 'error');
        }
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
                // 清除搜尋並重新載入所有資料
                await this.forceRefreshAllData();
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

    async loadData(query = '') {
        // 顯示載入狀態
        this.showLoading(true, '載入中...');
        
        try {
            const endpoint = query ? `/api/search/${encodeURIComponent(query)}` : '/api/keys';
            const response = await fetch(endpoint);
            const result = await response.json();
            
            if (result.success) {
                await this.displayData(result.keys);
            } else {
                this.showNotification('載入資料失敗: ' + result.error, 'error');
                const dataList = document.getElementById('data-list');
                dataList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>載入失敗</h3><p>' + result.error + '</p></div>';
            }
        } catch (error) {
            console.error('載入資料錯誤:', error);
            this.showNotification('載入資料失敗', 'error');
            const dataList = document.getElementById('data-list');
            dataList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>載入失敗</h3><p>網路錯誤或伺服器無回應</p></div>';
        }
        // 不需要 finally，因為 displayData 會處理內容替換
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
        // 如果 show 為 false，不做任何操作，讓 displayData 來處理內容
    }

    async refreshData() {
        console.log('開始重新載入資料...');
        
        try {
            // 重新載入資料並更新統計資訊
            await this.loadData(this.currentSearchQuery);
            await this.loadStats();
            console.log('資料已重新載入');
        } catch (error) {
            console.error('重新載入資料時發生錯誤:', error);
            this.showNotification('重新載入失敗', 'error');
        }
    }

    // 強制重新載入所有資料（忽略搜尋狀態）
    async forceRefreshAllData() {
        console.log('開始強制重新載入所有資料...');
        
        this.currentSearchQuery = '';
        document.getElementById('search-input').value = '';
        
        try {
            // 等待資料載入完成
            await this.loadData('');
            await this.loadStats();
            console.log('已強制重新載入所有資料');
        } catch (error) {
            console.error('強制重新載入資料時發生錯誤:', error);
            this.showNotification('重新載入失敗', 'error');
        }
    }

    async searchData() {
        const query = document.getElementById('search-input').value.trim();
        this.currentSearchQuery = query;
        
        console.log('開始搜尋:', query || '(顯示所有資料)');
        
        try {
            await this.loadData(query);
            // 搜尋後也更新統計資訊
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
        document.getElementById('value-input').value = '';
        document.getElementById('key-input').disabled = false;
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
                document.getElementById('value-input').value = value;
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
                // 刪除完成後重新載入資料，保持當前搜尋狀態
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
        const valueText = document.getElementById('value-input').value.trim();
        
        if (!key) {
            this.showNotification('鍵值不能為空', 'error');
            return;
        }

        let value;
        try {
            // 嘗試解析為 JSON
            value = JSON.parse(valueText);
        } catch {
            // 如果不是有效的 JSON，就作為字串處理
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
                // 操作完成後立即強制重新載入所有資料
                await this.forceRefreshAllData();
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
                // 清空資料庫後強制重新載入所有資料
                await this.forceRefreshAllData();
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