#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./utils/platform');
const ProcessUtils = require('./utils/process');
const EnvUtils = require('./utils/env');
const N8nInstaller = require('./install-n8n');
const EnvLoader = require('./load-env');

class N8nStarter {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
        this.envFilePath = path.join(this.paths.configDir, '.env');
    }

    async run() {
        try {
            console.clear();
            console.log('=======================================');
            console.log('           n8n 便携版 启动器');
            console.log('=======================================');
            console.log('正在启动 n8n 便携版...');
            console.log();

            // 检查 Node.js 运行时
            if (!fs.existsSync(this.paths.nodeExecutable)) {
                throw new Error('Node.js 运行时不存在。请先运行 scripts/start.cmd 它会自动下载 Node.js');
            }

            // 检查并安装 n8n
            await this.ensureN8nInstallation();

            // 配置环境
            this.configureEnvironment();

            // 加载环境变量
            await this.loadEnvironmentVariables();

            // 创建数据目录
            this.createDataDirectories();

            // 显示配置信息
            this.displayConfiguration();

            // 启动 n8n
            await this.startN8n();

            return 0;

        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        }
    }


    async ensureN8nInstallation() {
        const n8nBinaryPath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'bin', 'n8n');
        
        if (!fs.existsSync(n8nBinaryPath)) {
            console.log('未检测到 n8n 安装，正在安装...');
            
            const installer = new N8nInstaller();
            const result = await installer.run();
            
            if (result !== 0) {
                throw new Error('n8n 安装失败，无法启动');
            }
        }
    }

    configureEnvironment() {
        // 设置基本环境
        process.env.NODE_PATH = path.join(this.paths.libDir, 'node_modules');
        
        // 更新 PATH
        const currentPath = process.env.PATH || '';
        const pathSeparator = PlatformUtils.isWindows ? ';' : ':';
        
        if (!currentPath.includes(this.paths.binDir)) {
            process.env.PATH = this.paths.binDir + pathSeparator + currentPath;
        }
    }

    async loadEnvironmentVariables() {
        if (!fs.existsSync(this.envFilePath)) {
            throw new Error(`环境配置文件不存在: ${this.envFilePath}\n请确保 config/.env 文件存在并配置了必要的环境变量`);
        }

        console.log(`从 ${this.envFilePath} 加载配置...`);
        
        try {
            const envLoader = new EnvLoader();
            const result = await envLoader.run();
            
            if (result !== 0) {
                throw new Error('环境变量加载失败');
            }
        } catch (error) {
            throw new Error(`无法加载环境变量文件: ${error.message}`);
        }
    }


    createDataDirectories() {
        const dataDir = path.join(this.paths.projectRoot, 'data');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // 创建其他必要的子目录
        const subDirs = ['database', 'logs', 'binary-data'];
        for (const subDir of subDirs) {
            const dirPath = path.join(dataDir, subDir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
    }

    displayConfiguration() {
        const host = process.env.N8N_HOST || 'localhost';
        const port = process.env.N8N_PORT || '5678';
        const userFolder = process.env.N8N_USER_FOLDER || './data';
        const database = process.env.DB_SQLITE_DATABASE || './data/database/n8n.sqlite';

        console.log();
        console.log('n8n 配置信息:');
        console.log(`  主机地址: ${host}`);
        console.log(`  端口号:   ${port}`);
        console.log(`  数据目录: ${userFolder}`);
        console.log(`  数据库:   ${database}`);
        console.log();
        console.log('=======================================');
        console.log(`启动完成后可访问: http://${host}:${port}`);
        console.log('=======================================');
        console.log();
        console.log('使用指南:');
        console.log('  - 按 Ctrl+C 停止服务');
        console.log('  - 或运行 scripts/stop.bat 停止服务');
        console.log('  - 更多帮助请查看项目文档');
        console.log();
    }

    async startN8n() {
        const n8nBinaryPath = path.join(this.paths.libDir, 'node_modules', 'n8n', 'bin', 'n8n');
        
        if (!fs.existsSync(n8nBinaryPath)) {
            throw new Error('n8n 可执行文件不存在');
        }

        console.log('正在启动 n8n...');
        console.log();

        try {
            // 设置进程标题
            if (PlatformUtils.isWindows) {
                process.title = 'n8n 便携版';
            }

            // 启动 n8n
            await ProcessUtils.runCommand(this.paths.nodeExecutable, [n8nBinaryPath, 'start'], {
                cwd: this.paths.projectRoot,
                stdio: 'inherit'
            });

        } catch (error) {
            if (error.message.includes('EADDRINUSE')) {
                const port = process.env.N8N_PORT || '5678';
                throw new Error(`端口 ${port} 已被占用，请检查是否已有 n8n 实例在运行`);
            }
            throw new Error(`启动 n8n 失败: ${error.message}`);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const starter = new N8nStarter();
    
    // 处理中断信号
    process.on('SIGINT', () => {
        console.log('\n正在停止 n8n...');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n正在停止 n8n...');
        process.exit(0);
    });

    starter.run()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = N8nStarter;