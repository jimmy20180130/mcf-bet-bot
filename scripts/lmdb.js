const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const databaseService = require('../services/general/databaseService');

class LMDBCLIManager {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
        this.createWebInterface();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // 靜態文件服務
        const webDir = path.join(__dirname, 'web');
        if (!fs.existsSync(webDir)) {
            fs.mkdirSync(webDir, { recursive: true });
        }
        this.app.use(express.static(webDir));
    }

    setupRoutes() {
        // 根路徑重定向到管理界面
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'web', 'index.html'));
        });

        // API 路由
        this.app.get('/api/keys', this.getKeys.bind(this));
        this.app.get('/api/prefixes', this.getPrefixes.bind(this));
        this.app.get('/api/data/:key', this.getData.bind(this));
        this.app.get('/api/range/:prefix', this.getRange.bind(this));
        this.app.get('/api/range', this.getRange.bind(this));
        this.app.post('/api/data', this.createData.bind(this));
        this.app.put('/api/data/:key', this.updateData.bind(this));
        this.app.delete('/api/data/:key', this.deleteData.bind(this));
        this.app.get('/api/stats', this.getStats.bind(this));
        this.app.post('/api/clear', this.clearDatabase.bind(this));
        this.app.get('/api/search/:query', this.searchKeys.bind(this));
    }

    // API 處理函數
    async getPrefixes(req, res) {
        try {
            const allKeys = await databaseService.getKeys();
            const prefixes = new Set();
            
            allKeys.forEach(key => {
                const parts = key.split(':');
                if (parts.length > 1) {
                    prefixes.add(parts[0]);
                }
            });
            
            res.json({ success: true, prefixes: Array.from(prefixes).sort() });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getKeys(req, res) {
        try {
            const prefix = req.query.prefix || '';
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 30;
            
            const allKeys = await databaseService.getKeys(prefix);
            const total = allKeys.length;
            const totalPages = Math.ceil(total / pageSize);
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const keys = allKeys.slice(start, end);
            
            res.json({ 
                success: true, 
                keys,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getData(req, res) {
        try {
            const { key } = req.params;
            const data = await databaseService.get(key);
            if (data !== null) {
                res.json({ success: true, key, data });
            } else {
                res.status(404).json({ success: false, error: '資料不存在' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getRange(req, res) {
        try {
            const prefix = req.params.prefix || req.query.prefix || '';
            const data = await databaseService.getRange(prefix);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async createData(req, res) {
        try {
            const { key, value } = req.body;
            if (!key) {
                return res.status(400).json({ success: false, error: '鍵值不能為空' });
            }

            // 檢查是否已存在
            const exists = await databaseService.exists(key);
            if (exists) {
                return res.status(409).json({ success: false, error: '資料已存在' });
            }

            const success = await databaseService.put(key, value);
            if (success) {
                // 操作成功，回傳成功訊息並提示前端重新載入
                res.json({ 
                    success: true, 
                    message: '資料創建成功',
                    key: key,
                    needRefresh: true
                });
            } else {
                res.status(500).json({ success: false, error: '創建資料失敗' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateData(req, res) {
        try {
            const { key } = req.params;
            const { value } = req.body;
            
            const success = await databaseService.put(key, value);
            if (success) {
                // 操作成功，回傳成功訊息並提示前端重新載入
                res.json({ 
                    success: true, 
                    message: '資料更新成功',
                    key: key,
                    needRefresh: true
                });
            } else {
                res.status(500).json({ success: false, error: '更新資料失敗' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async deleteData(req, res) {
        try {
            const { key } = req.params;
            const success = await databaseService.remove(key);
            if (success) {
                // 操作成功，回傳成功訊息並提示前端重新載入
                res.json({ 
                    success: true, 
                    message: '資料刪除成功',
                    key: key,
                    needRefresh: true
                });
            } else {
                res.status(404).json({ success: false, error: '資料不存在或刪除失敗' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const stats = await databaseService.getStats();
            const keys = await databaseService.getKeys();
            const customStats = {
                totalKeys: keys.length,
                ...stats
            };
            res.json({ success: true, stats: customStats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async clearDatabase(req, res) {
        try {
            const success = await databaseService.clear();
            if (success) {
                // 操作成功，回傳成功訊息並提示前端重新載入
                res.json({ 
                    success: true, 
                    message: '資料庫清空成功',
                    needRefresh: true
                });
            } else {
                res.status(500).json({ success: false, error: '清空資料庫失敗' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async searchKeys(req, res) {
        try {
            const { query } = req.params;
            const allKeys = await databaseService.getKeys();
            const filteredKeys = allKeys.filter(key => 
                key.toLowerCase().includes(query.toLowerCase())
            );
            res.json({ success: true, keys: filteredKeys });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    createWebInterface() {
        const webDir = path.join(__dirname, 'web');
        
        // 創建 HTML 文件
        const htmlContent = this.getHTMLContent();
        fs.writeFileSync(path.join(webDir, 'index.html'), htmlContent);

        // 創建 CSS 文件
        const cssContent = this.getCSSContent();
        fs.writeFileSync(path.join(webDir, 'styles.css'), cssContent);

        // 創建 JavaScript 文件
        const jsContent = this.getJSContent();
        fs.writeFileSync(path.join(webDir, 'app.js'), jsContent);
    }

    getHTMLContent() {
        return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LMDB 資料庫管理器</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/editor/editor.main.css">
</head>
<body>
    <div class="app-container">
        <!-- 側邊欄 -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-folder-tree"></i> Prefixes</h2>
            </div>
            <div class="sidebar-content">
                <div class="prefix-item active" data-prefix="">
                    <i class="fas fa-list"></i>
                    <span>全部資料</span>
                </div>
                <div id="prefix-list"></div>
            </div>
        </aside>

        <!-- 主內容區 -->
        <div class="main-container">
            <header>
                <h1><i class="fas fa-database"></i> LMDB 資料庫管理器</h1>
                <div class="stats" id="stats">
                    <span class="stat-item" id="total-keys">總鍵值: 0</span>
                    <span class="stat-item">
                        <button id="refresh-btn" class="btn btn-secondary">
                            <i class="fas fa-sync-alt"></i> 刷新
                        </button>
                    </span>
                </div>
            </header>

            <main>
                <!-- 搜尋和操作區域 -->
                <section class="controls">
                    <div class="search-bar">
                        <i class="fas fa-search"></i>
                        <input type="text" id="search-input" placeholder="搜尋鍵值...">
                        <button id="search-btn" class="btn btn-primary">搜尋</button>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="add-btn" class="btn btn-success">
                            <i class="fas fa-plus"></i> 新增資料
                        </button>
                        <button id="clear-btn" class="btn btn-danger">
                            <i class="fas fa-trash"></i> 清空資料庫
                        </button>
                    </div>
                </section>

                <!-- 資料列表區域 -->
                <section class="data-section">
                    <div class="data-list" id="data-list">
                        <div class="loading" id="loading">
                            <i class="fas fa-spinner fa-spin"></i> 載入中...
                        </div>
                    </div>
                    
                    <!-- 分頁控制 -->
                    <div class="pagination" id="pagination"></div>
                </section>
            </main>
        </div>
    </div>

    <!-- 模態框 -->
    <div id="modal" class="modal">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2 id="modal-title">編輯資料</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="data-form">
                    <div class="form-group">
                        <label for="key-input">鍵值 (Key):</label>
                        <input type="text" id="key-input" name="key" required>
                    </div>
                    <div class="form-group">
                        <label for="value-input">資料值 (Value):</label>
                        <div id="monaco-editor" style="height: 400px; border: 2px solid #e2e8f0; border-radius: 8px;"></div>
                        <textarea id="value-input" name="value" style="display: none;"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> 儲存
                        </button>
                        <button type="button" class="btn btn-secondary" id="cancel-btn">
                            <i class="fas fa-times"></i> 取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 確認刪除模態框 -->
    <div id="confirm-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>確認刪除</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>確定要刪除這個資料嗎？</p>
                <p><strong>鍵值:</strong> <span id="delete-key"></span></p>
                <div class="form-actions">
                    <button id="confirm-delete" class="btn btn-danger">
                        <i class="fas fa-trash"></i> 確認刪除
                    </button>
                    <button id="cancel-delete" class="btn btn-secondary">
                        <i class="fas fa-times"></i> 取消
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 通知區域 -->
    <div id="notification" class="notification"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.js"></script>
    <script src="app.js"></script>
</body>
</html>`;
    }

    getCSSContent() {
        return `* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
    overflow: hidden;
}

.app-container {
    display: flex;
    height: 100vh;
}

/* 側邊欄樣式 */
.sidebar {
    width: 250px;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.sidebar-header {
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.sidebar-header h2 {
    font-size: 1.2em;
    display: flex;
    align-items: center;
    gap: 10px;
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

.prefix-item {
    padding: 12px 15px;
    margin-bottom: 5px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #4a5568;
}

.prefix-item:hover {
    background: #f0f0f0;
}

.prefix-item.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.prefix-item i {
    font-size: 14px;
}

/* 主容器樣式 */
.main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0 0 15px 15px;
    padding: 20px;
    margin: 0 20px 20px 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

header h1 {
    color: #4a5568;
    margin-bottom: 15px;
    text-align: center;
    font-size: 2.2em;
}

.stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.stat-item {
    color: #666;
    font-weight: 500;
}

main {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 20px 20px;
}

.controls {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-bar {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    position: relative;
}

.search-bar i {
    position: absolute;
    left: 15px;
    color: #999;
}

.search-bar input {
    flex: 1;
    padding: 12px 15px 12px 45px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 16px;
    transition: border-color 0.3s ease;
}

.search-bar input:focus {
    outline: none;
    border-color: #667eea;
}

.action-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.btn i {
    font-size: 14px;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-success {
    background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
    color: white;
}

.btn-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(86, 171, 47, 0.4);
}

.btn-danger {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    color: white;
}

.btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
}

.btn-secondary {
    background: #f8f9fa;
    color: #6c757d;
    border: 2px solid #e9ecef;
}

.btn-secondary:hover {
    background: #e9ecef;
    transform: translateY(-1px);
}

.data-section {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.data-list {
    min-height: 400px;
}

.data-item {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
}

.data-item:hover {
    background: #e9ecef;
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.data-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.data-key {
    font-weight: 600;
    color: #2d3748;
    word-break: break-all;
}

.data-actions {
    display: flex;
    gap: 5px;
}

.btn-small {
    padding: 6px 12px;
    font-size: 12px;
}

.data-preview {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 10px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #4a5568;
    max-height: 100px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
}

.loading {
    text-align: center;
    color: #666;
    padding: 40px;
    font-size: 18px;
}

.empty-state {
    text-align: center;
    color: #666;
    padding: 40px;
}

.empty-state i {
    font-size: 64px;
    color: #cbd5e0;
    margin-bottom: 20px;
}

/* 分頁樣式 */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
}

.pagination-info {
    color: #666;
    font-size: 14px;
}

.pagination button {
    padding: 8px 16px;
    border: 2px solid #e2e8f0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
}

.pagination button:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination .page-number {
    min-width: 40px;
    text-align: center;
}

.pagination .page-number.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #667eea;
}

/* 模態框樣式 */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 0;
    border-radius: 15px;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
}

.modal-large {
    max-width: 900px;
}

.modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    margin: 0;
}

.close {
    color: white;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    line-height: 1;
}

.close:hover {
    opacity: 0.7;
}

.modal-body {
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #2d3748;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

.form-group textarea {
    resize: vertical;
    font-family: 'Courier New', monospace;
}

.form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

/* 通知樣式 */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    z-index: 1001;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.notification.show {
    transform: translateX(0);
}

.notification.success {
    background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
}

.notification.error {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.notification.info {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 響應式設計 */
@media (max-width: 768px) {
    .app-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
        max-height: 200px;
    }
    
    .container {
        padding: 10px;
    }
    
    .stats {
        flex-direction: column;
        align-items: stretch;
    }
    
    .search-bar {
        flex-direction: column;
        gap: 10px;
    }
    
    .search-bar input {
        padding-left: 15px;
    }
    
    .search-bar i {
        display: none;
    }
    
    .action-buttons {
        justify-content: stretch;
    }
    
    .action-buttons .btn {
        flex: 1;
        justify-content: center;
    }
    
    .data-item-header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
    
    .data-actions {
        justify-content: center;
    }
    
    .form-actions {
        flex-direction: column;
    }
    
    .modal-content {
        margin: 2% auto;
        width: 95%;
    }
}`;
    }

    getJSContent() {
        return `class LMDBManager {
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
                prefixList.innerHTML = result.prefixes.map(prefix => \`
                    <div class="prefix-item" data-prefix="\${prefix}" onclick="lmdbManager.selectPrefix('\${this.escapeHtml(prefix)}')">
                        <i class="fas fa-folder"></i>
                        <span>\${this.escapeHtml(prefix)}</span>
                    </div>
                \`).join('');
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
                endpoint = \`/api/search/\${encodeURIComponent(query)}\`;
            } else {
                const params = new URLSearchParams({
                    prefix: this.currentPrefix,
                    page: this.currentPage,
                    pageSize: this.pageSize
                });
                endpoint = \`/api/keys?\${params}\`;
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
            dataList.innerHTML = \`
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>沒有找到資料</h3>
                    <p>資料庫是空的或沒有符合搜尋條件的資料</p>
                </div>
            \`;
            return;
        }

        const dataItems = await Promise.all(keys.map(async (key) => {
            try {
                const response = await fetch(\`/api/data/\${encodeURIComponent(key)}\`);
                const result = await response.json();
                const value = result.success ? result.data : '無法載入';
                const preview = this.formatPreview(value);
                
                return \`
                    <div class="data-item">
                        <div class="data-item-header">
                            <span class="data-key">\${this.escapeHtml(key)}</span>
                            <div class="data-actions">
                                <button class="btn btn-primary btn-small" onclick="lmdbManager.editData('\${this.escapeHtml(key)}')">
                                    <i class="fas fa-edit"></i> 編輯
                                </button>
                                <button class="btn btn-danger btn-small" onclick="lmdbManager.confirmDelete('\${this.escapeHtml(key)}')">
                                    <i class="fas fa-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                        <div class="data-preview">\${preview}</div>
                    </div>
                \`;
            } catch (error) {
                return \`
                    <div class="data-item">
                        <div class="data-item-header">
                            <span class="data-key">\${this.escapeHtml(key)}</span>
                            <div class="data-actions">
                                <button class="btn btn-danger btn-small" onclick="lmdbManager.confirmDelete('\${this.escapeHtml(key)}')">
                                    <i class="fas fa-trash"></i> 刪除
                                </button>
                            </div>
                        </div>
                        <div class="data-preview">載入錯誤</div>
                    </div>
                \`;
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
        html += \`<button onclick="lmdbManager.goToPage(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> 上一頁
        </button>\`;
        
        // 頁碼按鈕
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        if (startPage > 1) {
            html += \`<button class="page-number" onclick="lmdbManager.goToPage(1)">1</button>\`;
            if (startPage > 2) {
                html += '<span>...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += \`<button class="page-number \${i === currentPage ? 'active' : ''}" onclick="lmdbManager.goToPage(\${i})">\${i}</button>\`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<span>...</span>';
            }
            html += \`<button class="page-number" onclick="lmdbManager.goToPage(\${totalPages})">\${totalPages}</button>\`;
        }
        
        // 下一頁按鈕
        html += \`<button onclick="lmdbManager.goToPage(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>
            下一頁 <i class="fas fa-chevron-right"></i>
        </button>\`;
        
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
                document.getElementById('total-keys').textContent = \`總鍵值: \${result.stats.totalKeys}\`;
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
            const response = await fetch(\`/api/data/\${encodeURIComponent(key)}\`);
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
            const response = await fetch(\`/api/data/\${encodeURIComponent(key)}\`, {
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
        const endpoint = isEdit ? \`/api/data/\${encodeURIComponent(key)}\` : '/api/data';

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
const lmdbManager = new LMDBManager();`;
    }

    start() {
        return new Promise((resolve) => {
            const server = this.app.listen(this.port, () => {
                console.log('資料庫管理器已上線: http://localhost:' + this.port);
                console.log('按 Ctrl+C 可關閉伺服器');
                
                resolve(server);
            });
        });
    }
}

// 當直接執行此腳本時啟動管理器
if (require.main === module) {
    (async () => {
        try {
            // 初始化資料庫服務
            console.log('正在初始化資料庫...');
            await databaseService.init();
            console.log('資料庫初始化成功');
            
            // 啟動管理器
            const manager = new LMDBCLIManager();
            await manager.start();
        } catch (error) {
            console.error('啟動失敗:', error);
            process.exit(1);
        }
    })();
    
    // 優雅關閉
    process.on('SIGINT', async () => {
        console.log('\n正在關閉 LMDB 管理器...');
        await databaseService.close();
        process.exit(0);
    });
}

module.exports = LMDBCLIManager;
