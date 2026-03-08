class AuthService {
    constructor(token, client) {
        this.token = token
        this.mcClient = client
    }

    async authenticate() {
        return true
    }
}

module.exports = AuthService