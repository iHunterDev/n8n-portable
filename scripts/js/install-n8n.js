#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./utils/platform');
const ProcessUtils = require('./utils/process');

class N8nInstaller {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
        this.defaultVersion = ''; // 空字符串表示最新版本
    }

    async run(args = []) {
        try {
            console.log('=======================================');
            console.log('           安装 n8n 便携版');
            console.log('=======================================');

            const version = args[0] || this.defaultVersion;
            const n8nPackage = version ? `n8n@${version}` : 'n8n';

            if (version) {
                console.log(`使用指定 n8n 版本: ${version}`);
            } else {
                console.log('使用最新版本的 n8n');
            }

            // 检查 Node.js 运行时
            if (!fs.existsSync(this.paths.nodeExecutable)) {
                throw new Error('Node.js 运行时不存在。请先运行 scripts/download-nodejs.bat 下载 Node.js');
            }

            // 检查现有安装
            if (await this.checkExistingInstallation(version)) {
                console.log('n8n 版本已是目标版本，无需重新安装');
                return 0;
            }

            // 创建必要的目录
            this.createDirectories();

            // 配置 npm 环境
            this.configureNpmEnvironment();

            // 创建 package.json
            this.createPackageJson();

            // 安装 n8n
            await this.installN8n(n8nPackage);

            // 验证安装
            await this.verifyInstallation();

            console.log('=======================================');
            console.log();
            console.log('安装完成! 现在可以运行 scripts/start.bat 启动 n8n');

            return 0;

        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        }
    }


    async checkExistingInstallation(targetVersion) {
        const n8nPackagePath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'package.json');
        
        if (!fs.existsSync(n8nPackagePath)) {
            return false;
        }

        console.log('检测到已安装的 n8n');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(n8nPackagePath, 'utf8'));
            const currentVersion = packageJson.version;
            
            console.log(`当前版本: ${currentVersion}`);
            
            if (targetVersion) {
                if (currentVersion === targetVersion) {
                    return true;
                } else {
                    console.log('版本不匹配，将重新安装');
                    return false;
                }
            } else {
                console.log('如需更新到最新版本，请重新运行安装脚本');
                return true;
            }
        } catch (error) {
            console.log('无法读取现有版本信息，将重新安装');
            return false;
        }
    }

    createDirectories() {
        console.log('创建必要的目录...');
        
        PlatformUtils.ensureDirectoryExists(this.paths.libDir);
        PlatformUtils.ensureDirectoryExists(this.paths.tempDir);
        
        console.log(`  lib 目录: ${this.paths.libDir}`);
        console.log(`  temp 目录: ${this.paths.tempDir}`);
    }

    configureNpmEnvironment() {
        console.log('正在配置 npm 环境...');
        
        const npmCacheDir = path.join(this.paths.tempDir, 'npm-cache');
        
        process.env.NPM_CONFIG_PREFIX = this.paths.libDir;
        process.env.NPM_CONFIG_CACHE = npmCacheDir;
        process.env.PATH = this.paths.binDir + path.delimiter + process.env.PATH;
        
        console.log(`  NPM 前缀: ${this.paths.libDir}`);
        console.log(`  缓存目录: ${npmCacheDir}`);
        console.log();
    }

    createPackageJson() {
        const packageJsonPath = path.join(this.paths.libDir, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            console.log('创建 package.json...');
            
            const packageJson = {
                "name": "n8n-portable",
                "private": true,
                "dependencies": {}
            };
            
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
    }

    async installN8n(n8nPackage) {
        console.log(`正在安装 n8n...`);
        console.log(`安装包: ${n8nPackage}`);
        console.log();

        const npmExecutable = this.paths.npmExecutable;
        const args = ['install', n8nPackage, '--save', '--no-audit', '--no-fund', '--progress=true'];

        try {
            await ProcessUtils.runCommand(npmExecutable, args, {
                cwd: this.paths.libDir,
                stdio: 'inherit'
            });
        } catch (error) {
            throw new Error(`n8n 安装失败: ${error.message}`);
        }
    }

    async verifyInstallation() {
        const n8nPackagePath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'package.json');
        const n8nBinaryPath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'bin', 'n8n');

        if (!fs.existsSync(n8nPackagePath)) {
            throw new Error('n8n 安装验证失败: package.json 不存在');
        }

        console.log('=======================================');
        console.log('n8n 安装成功!');

        try {
            const packageJson = JSON.parse(fs.readFileSync(n8nPackagePath, 'utf8'));
            console.log(`安装版本: ${packageJson.version}`);
        } catch (error) {
            console.log('无法读取版本信息');
        }

        if (fs.existsSync(n8nBinaryPath)) {
            console.log(`n8n 可执行文件: ${path.relative(this.paths.projectRoot, n8nBinaryPath)}`);
        } else {
            console.log('警告: 找不到 n8n 可执行文件');
        }

        console.log('=======================================');
    }

    static async getInstalledVersion(paths) {
        const n8nPackagePath = path.join(paths.libDir, 'node_modules', 'n8n', 'package.json');
        
        if (!fs.existsSync(n8nPackagePath)) {
            return null;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(n8nPackagePath, 'utf8'));
            return packageJson.version;
        } catch (error) {
            return null;
        }
    }

    static isN8nInstalled(paths) {
        const n8nBinaryPath = path.join(paths.libDir, 'node_modules', 'n8n', 'bin', 'n8n');
        return fs.existsSync(n8nBinaryPath);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const installer = new N8nInstaller();
    const args = process.argv.slice(2);
    
    installer.run(args)
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = N8nInstaller;