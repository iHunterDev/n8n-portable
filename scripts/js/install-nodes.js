#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./utils/platform');
const ProcessUtils = require('./utils/process');
const NodeJSDownloader = require('./download-nodejs');

class N8nNodesInstaller {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
        this.nodesDir = path.join(this.paths.dataDir, '.n8n', 'nodes');
    }

    async run(args = []) {
        try {
            console.log('=======================================');
            console.log('       安装 n8n 第三方节点');
            console.log('=======================================');

            if (args.length === 0) {
                console.error('错误: 请提供要安装的节点包名');
                console.log();
                console.log('用法:');
                console.log(`  ${process.argv[1]} 节点包名1 [节点包名2 ...]`);
                console.log();
                console.log('示例:');
                console.log(`  ${process.argv[1]} @n8n/n8n-nodes-langchain`);
                console.log(`  ${process.argv[1]} n8n-nodes-google-sheets n8n-nodes-slack`);
                console.log(`  ${process.argv[1]} https://github.com/user/custom-node`);
                return 1;
            }

            // 检查 Node.js 运行时
            await this.ensureNodeJSRuntime();

            // 检查 n8n 是否已安装
            await this.checkN8nInstallation();

            // 准备节点安装环境
            await this.prepareNodesEnvironment();

            // 安装所有节点包
            const results = await this.installNodePackages(args);

            // 显示安装结果
            this.displayInstallationResults(results);

            return results.failed > 0 ? 1 : 0;

        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        }
    }

    async ensureNodeJSRuntime() {
        if (!fs.existsSync(this.paths.nodeExecutable)) {
            console.log('未检测到 Node.js 运行时，正在下载...');
            
            const downloader = new NodeJSDownloader();
            const result = await downloader.run();
            
            if (result !== 0) {
                throw new Error('Node.js 下载失败，无法安装节点');
            }
        }
    }

    async checkN8nInstallation() {
        const n8nPackagePath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'package.json');
        
        if (!fs.existsSync(n8nPackagePath)) {
            throw new Error('未检测到 n8n 安装，请先运行 scripts/install-n8n 安装 n8n');
        }
    }

    async prepareNodesEnvironment() {
        console.log('正在准备节点安装环境...');

        // 创建节点目录
        PlatformUtils.ensureDirectoryExists(this.nodesDir);
        PlatformUtils.ensureDirectoryExists(path.join(this.nodesDir, 'node_modules'));

        // 创建节点包的 package.json
        const packageJsonPath = path.join(this.nodesDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.log('创建节点包配置文件...');
            
            const packageJson = {
                "name": "installed-nodes",
                "private": true,
                "dependencies": {}
            };
            
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }

        // 配置 npm 环境
        const npmCacheDir = path.join(this.paths.tempDir, 'npm-cache');
        
        process.env.NPM_CONFIG_PREFIX = this.nodesDir;
        process.env.NPM_CONFIG_CACHE = npmCacheDir;
        process.env.PATH = this.paths.binDir + path.delimiter + process.env.PATH;

        console.log(`  节点安装目录: ${this.nodesDir}`);
        console.log(`  Node.js 运行时: ${this.paths.nodeExecutable}`);
        console.log();

        // 确保临时目录存在
        PlatformUtils.ensureDirectoryExists(this.paths.tempDir);
    }

    async installNodePackages(packageNames) {
        const results = {
            total: packageNames.length,
            success: 0,
            failed: 0,
            packages: []
        };

        console.log(`开始安装 ${packageNames.length} 个节点包...`);
        console.log();

        for (let i = 0; i < packageNames.length; i++) {
            const packageName = packageNames[i];
            const packageIndex = i + 1;
            
            console.log(`[${packageIndex}/${packageNames.length}] 正在安装: ${packageName}`);
            console.log();

            try {
                await this.installSinglePackage(packageName);
                
                console.log(`SUCCESS: 节点 ${packageName} 安装成功`);
                results.success++;
                results.packages.push({ name: packageName, status: 'success' });
                
            } catch (error) {
                console.error(`ERROR: 节点 ${packageName} 安装失败: ${error.message}`);
                results.failed++;
                results.packages.push({ name: packageName, status: 'failed', error: error.message });
            }
            
            console.log();
        }

        return results;
    }

    async installSinglePackage(packageName) {
        const npmExecutable = this.paths.npmExecutable;
        const args = ['install', packageName, '--save', '--no-audit', '--no-fund', '--progress=false'];

        console.log(`DEBUG: 执行 npm install ${packageName}`);
        console.log(`DEBUG: 当前目录: ${this.nodesDir}`);
        console.log(`DEBUG: npm 路径: ${npmExecutable}`);

        await ProcessUtils.runCommand(npmExecutable, args, {
            cwd: this.nodesDir,
            stdio: 'inherit'
        });
    }

    displayInstallationResults(results) {
        console.log('=======================================');
        console.log('           安装结果汇总');
        console.log('=======================================');
        console.log(`Total packages attempted: ${results.total}`);
        console.log(`Successfully installed: ${results.success}`);
        console.log(`Failed to install: ${results.failed}`);
        console.log();

        if (results.failed > 0) {
            console.log(`Warning: ${results.failed} packages failed to install`);
            console.log('Please check package names and network connection');
            console.log();
        }

        if (results.success > 0) {
            console.log(`Installed nodes location: ${path.relative(this.paths.projectRoot, this.nodesDir)}/node_modules/`);
            console.log();
            console.log('Installed nodes:');
            
            // 列出已安装的包
            this.listInstalledPackages();
            
            console.log();
            console.log('SUCCESS! Nodes installation completed');
            console.log('Restart n8n for new nodes to take effect');
            console.log('Run scripts/start to start n8n');
        } else {
            console.log('ERROR: No nodes were successfully installed');
        }

        console.log('=======================================');
    }

    listInstalledPackages() {
        const nodeModulesDir = path.join(this.nodesDir, 'node_modules');
        
        if (!fs.existsSync(nodeModulesDir)) {
            return;
        }

        try {
            // 列出普通包
            const items = fs.readdirSync(nodeModulesDir);
            
            for (const item of items) {
                const itemPath = path.join(nodeModulesDir, item);
                const packageJsonPath = path.join(itemPath, 'package.json');
                
                if (fs.statSync(itemPath).isDirectory() && fs.existsSync(packageJsonPath)) {
                    if (item.startsWith('@')) {
                        // 处理作用域包
                        const scopedItems = fs.readdirSync(itemPath);
                        for (const scopedItem of scopedItems) {
                            const scopedPath = path.join(itemPath, scopedItem);
                            const scopedPackageJson = path.join(scopedPath, 'package.json');
                            
                            if (fs.statSync(scopedPath).isDirectory() && fs.existsSync(scopedPackageJson)) {
                                console.log(`  - ${item}/${scopedItem}`);
                            }
                        }
                    } else {
                        console.log(`  - ${item}`);
                    }
                }
            }
        } catch (error) {
            console.log('  无法列出已安装的包');
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const installer = new N8nNodesInstaller();
    const args = process.argv.slice(2);
    
    installer.run(args)
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = N8nNodesInstaller;