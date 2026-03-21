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
            
            // Normalize slashes for require on Windows (convert \ to /)
            const moduleName = relativePath.split(path.sep).join('/');
            
            try {
                let originalPath;
                try {
                    // Try to resolve as a node_module first
                    originalPath = require.resolve(moduleName);
                } catch (e) {
                    // If not a node_module, try to resolve as a local file relative to project root
                    // process.cwd() is usually the project root when running the app
                    const localPath = path.resolve(process.cwd(), moduleName);
                    if (fs.existsSync(localPath)) {
                        originalPath = require.resolve(localPath);
                    }
                }

                // If we still don't have an originalPath, it might be a new file that doesn't exist in the original project.
                // In that case, we can't "patch" the cache for an existing file, but we can still load it
                // so it's available if other patched files require it relative to themselves.
                const patchModule = require(filePath);

                if (originalPath) {
                    // Patch the require cache
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
                    console.log(`[Patch] Applied: ${moduleName} -> ${originalPath}`);
                } else {
                    console.log(`[Patch] Loaded new file: ${moduleName}`);
                }
            } catch (err) {
                console.warn(`[Patch] Failed to patch ${moduleName}: ${err.message}`);
            }
        }
    });
}

console.log('[Patch] Starting automatic patching...');
walk(patchRoot);
console.log('[Patch] Completed.');
