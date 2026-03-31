const fs = require('fs');
const path = require('path');

const patchRoot = __dirname;

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walk(filePath);
        } else {
            if (filePath === __filename) return; 
            if (!file.endsWith('.js') && !file.endsWith('.json')) return;

            let relativePath = path.relative(patchRoot, filePath);
            
            const moduleName = relativePath.split(path.sep).join('/');
            
            try {
                let originalPath;
                try {
                    originalPath = require.resolve(moduleName);
                } catch (e) {
                    const localPath = path.resolve(process.cwd(), moduleName);
                    if (fs.existsSync(localPath)) {
                        originalPath = require.resolve(localPath);
                    }
                }

                const patchModule = require(filePath);

                if (originalPath) {
                    if (require.cache[originalPath]) {
                        require.cache[originalPath].exports = patchModule;
                        require.cache[originalPath].loaded = true;
                    } else {
                        require.cache[originalPath] = {
                            id: originalPath,
                            filename: originalPath,
                            loaded: true,
                            exports: patchModule
                        };
                    }
                    console.log(`[Patch] Patched: ${moduleName} -> ${originalPath}`);
                } else {
                    console.log(`[Patch] Loaded: ${moduleName}`);
                }
            } catch (err) {
                console.warn(`[Patch] Failed ${moduleName}: ${err.message}`);
            }
        }
    });
}

walk(patchRoot);
