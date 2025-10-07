// TODO: implement link
// TODO: implement auth
// TODO: implement get global blacklist

// link step:
// 1. authService 與驗證伺服器建立 websocket 連線
// 2. 收到綁定完成的訊息後紀錄到資料庫內

class AuthService {
    constructor() {
        this.globalBlacklist = []
    }

    async connect() {
        
    }
}   

module.exports = new AuthService()