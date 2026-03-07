class Logger {
    constructor(prefix, debugMode = false) {
        this.logs = [];
        this.debugMode = debugMode;
        this.prefix = prefix;
    }

    get count() {
        return this.logs.length;
    }

    get entries() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }

    _formatTimestamp(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    log(message) {
        const timestamp = this._formatTimestamp(new Date());
        this.logs.push({ message, timestamp });
        console.log(`[${timestamp}] [${this.prefix}] \x1b[36m[INFO]\x1b[0m ${message}`);
    }

    info(message) {
        this.log(message);
    }

    _getFileInfo(stack) {
        const match = stack.split('\n')[2].match(/\((.+?):(\d+):\d+\)$/);
        if (match) {
            const [, filePath, lineNumber] = match;
            return `\x1b[2m(${filePath.split(/[/\\]/).pop()}:${lineNumber})\x1b[0m`;
        }
        return '';
    }

    warn(message) {
        const timestamp = this._formatTimestamp(new Date());
        this.logs.push({ message, timestamp });
        const fileInfo = this._getFileInfo(new Error().stack || '');
        console.log(`[${timestamp}] [${this.prefix}] \x1b[33m[WARN]\x1b[0m \x1b[43m${message}\x1b[0m ${fileInfo}`);
    }

    error(...args) {
        const timestamp = this._formatTimestamp(new Date());
        const stack = new Error().stack || '';
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            } else {
                return arg;
            }
        }).join(' ');

        this.logs.push({ message, timestamp });
        const fileInfo = this._getFileInfo(stack);
        console.log(`[${timestamp}] [${this.prefix}] \x1b[31m[ERROR]\x1b[0m \x1b[41m${message}\x1b[0m ${fileInfo}`);
    }

    debug(message) {
        const timestamp = this._formatTimestamp(new Date());
        this.logs.push({ message, timestamp });

        if (!this.debugMode) return;

        const fileInfo = this._getFileInfo(new Error().stack || '');
        console.log(`[${timestamp}] [${this.prefix}] \x1b[34m[DEBUG]\x1b[0m ${message} ${fileInfo}`);
    }
}

module.exports = Logger;