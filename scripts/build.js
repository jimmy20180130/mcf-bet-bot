const path = require('path');
const fs = require('fs');

async function bundleExecutable() {
    const entryPoint = ['./index.js'];
    const outputDir = 'dist'
    const outputFile = './dist/mcf-bet-bot.exe'
    const iconPath = './app.ico'

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Verify icon file exists
    if (!fs.existsSync(iconPath)) {
        console.error(`Icon file not found at: ${iconPath}`);
        process.exit(1);
    }

    try {
        console.log('Bundling with Bun.build()...');
        await Bun.build({
            entrypoints: entryPoint,
            outdir: outputDir,
            compile: {
                target: 'bun-windows-x64', // Target Windows 64-bit
                outfile: 'mcf-bet-bot.exe',
                windows: {
                    title: 'mcBet-Bot',
                    publisher: 'Jimmy',
                    version: '1.0.0.0', // Use a valid version format
                    description: '廢土對賭機器人 by Jimmy',
                    copyright: '© 2025 Jimmy',
                    hideConsole: false, // Keep console for logging
                    icon: iconPath, // Path to your .ico file
                },
            },
        });

        console.log(`Executable created at ${outputFile}`);
        console.log('Windows metadata and icon applied successfully.');

        // Copy config.toml to the output directory (if needed)
        const configPath = path.join(__dirname, 'config.toml');
        const destConfigPath = path.join(outputDir, 'config.toml');
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