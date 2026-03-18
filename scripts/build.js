const path = require('path');
const fs = require('fs');

const BUILD_CONFIG = {
    entryPoint: ['./index.js'],
    outputDir: 'dist',
    outputFile: path.join('dist', 'mcf-bet-bot.exe'),
    iconPath: path.join('scripts', 'app.ico'),
};

async function bundleExecutable() {
    const entryPoint = BUILD_CONFIG.entryPoint;
    const outputDir = BUILD_CONFIG.outputDir;
    const outputFile = BUILD_CONFIG.outputFile;
    const iconPath = BUILD_CONFIG.iconPath;
    const outputFileAbs = path.resolve(outputFile);
    const iconPathAbs = path.resolve(iconPath);

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    if (!fs.existsSync(iconPathAbs)) {
        console.error(`Icon file not found at: ${iconPathAbs}`);
        process.exit(1);
    }

    try {
        console.log('Bundling with Bun.build()...');
        await Bun.build({
            entrypoints: entryPoint,
            outdir: outputDir,
            compile: {
                target: 'bun-windows-x64',
                outfile: 'mcf-bet-bot.exe',
                windows: {
                    hideConsole: false,
                    icon: iconPathAbs,
                },
            },
        });

        console.log(`Executable created at ${outputFileAbs}`);

        const configPath = path.resolve('config.toml');
        const destConfigPath = path.resolve(outputDir, 'config.toml');
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, destConfigPath);
            console.log(`Copied config.toml to ${destConfigPath}`);
        } else {
            console.warn('Warning: config.toml not found. The executable may fail if it requires this file.');
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bundleExecutable();