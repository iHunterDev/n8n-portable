const os = require('os');
const path = require('path');

class PlatformUtils {
    static get platform() {
        return os.platform();
    }

    static get arch() {
        return os.arch();
    }

    static get isWindows() {
        return this.platform === 'win32';
    }

    static get isLinux() {
        return this.platform === 'linux';
    }

    static get isMacOS() {
        return this.platform === 'darwin';
    }

    static getNodeJSDownloadInfo(version = '22.19.0') {
        const platform = this.platform;
        const arch = this.arch;
        
        let platformName, extension, executablePath;
        
        if (this.isWindows) {
            platformName = 'win';
            extension = 'zip';
            executablePath = path.join('bin', 'node.exe');
        } else if (this.isLinux) {
            platformName = 'linux';
            extension = 'tar.xz';
            executablePath = path.join('bin', 'node');
        } else if (this.isMacOS) {
            platformName = 'darwin';
            extension = 'tar.gz';
            executablePath = path.join('bin', 'node');
        } else {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        let archName;
        if (arch === 'x64') {
            archName = 'x64';
        } else if (arch === 'arm64') {
            archName = 'arm64';
        } else if (arch === 'ia32') {
            archName = 'x86';
        } else {
            throw new Error(`Unsupported architecture: ${arch}`);
        }

        const filename = `node-v${version}-${platformName}-${archName}.${extension}`;
        const url = `https://nodejs.org/dist/v${version}/${filename}`;
        const extractedDirName = `node-v${version}-${platformName}-${archName}`;

        return {
            url,
            filename,
            extension,
            extractedDirName,
            executablePath,
            platformName,
            archName
        };
    }

    static getSystemExecutableName(baseName) {
        return this.isWindows ? `${baseName}.exe` : baseName;
    }

    static getScriptExtension() {
        if (this.isWindows) return '.cmd';
        return '.sh';
    }

    static getNpmExecutableName() {
        return this.isWindows ? 'npm.cmd' : 'npm';
    }

    static getProcessKillCommand(processName) {
        if (this.isWindows) {
            return {
                command: 'taskkill',
                args: ['/f', '/im', processName]
            };
        } else {
            return {
                command: 'pkill',
                args: ['-f', processName]
            };
        }
    }

    static getDefaultPaths() {
        const projectRoot = path.resolve(__dirname, '..', '..', '..');
        return {
            projectRoot,
            binDir: path.join(projectRoot, 'bin'),
            libDir: path.join(projectRoot, 'lib'),
            dataDir: path.join(projectRoot, 'data'),
            configDir: path.join(projectRoot, 'config'),
            tempDir: path.join(projectRoot, 'temp'),
            scriptsDir: path.join(projectRoot, 'scripts'),
            nodeExecutable: path.join(projectRoot, 'bin', this.getSystemExecutableName('node')),
            npmExecutable: path.join(projectRoot, 'bin', this.getNpmExecutableName())
        };
    }

    static formatPath(pathStr) {
        return path.normalize(pathStr);
    }

    static ensureDirectoryExists(dirPath) {
        const fs = require('fs');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
}

module.exports = PlatformUtils;