const fs = require('fs');
const path = require('path');

class EnvUtils {
    static loadEnvironmentFile(envFilePath) {
        console.log(`从 ${envFilePath} 加载配置...`);
        console.log();

        if (!fs.existsSync(envFilePath)) {
            throw new Error(`Error: ${envFilePath} file not found`);
        }

        const envContent = fs.readFileSync(envFilePath, 'utf8');
        const envVars = this.parseEnvironmentContent(envContent);

        let varCount = 0;
        for (const [key, value] of Object.entries(envVars)) {
            process.env[key] = value;
            varCount++;

            // 隐藏敏感信息
            if (this.isSensitiveVariable(key)) {
                console.log(`  Set: ${key}=******`);
            } else {
                console.log(`  Set: ${key}=${value}`);
            }
        }

        console.log();
        if (varCount > 0) {
            console.log(`Success: ${varCount} environment variables loaded.`);
        } else {
            console.log('Warning: No valid environment variables found in .env file.');
            console.log('Check the file format: each line should be VARIABLE_NAME=value');
        }

        return varCount;
    }

    static parseEnvironmentContent(content) {
        const envVars = {};
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过空行和注释
            if (!line || line.startsWith('#')) {
                continue;
            }

            // 检查是否包含等号且不是以等号开头
            const equalIndex = line.indexOf('=');
            if (equalIndex <= 0) {
                console.log(`Skip: "${line}" (invalid format)`);
                continue;
            }

            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();

            // 移除值周围的引号
            let cleanValue = value;
            if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
                (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                cleanValue = cleanValue.slice(1, -1);
            }

            envVars[key] = cleanValue;
        }

        return envVars;
    }

    static isSensitiveVariable(key) {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /key/i,
            /token/i,
            /pass/i,
            /auth/i,
            /credential/i
        ];

        return sensitivePatterns.some(pattern => pattern.test(key));
    }

    static setDefaultEnvironment() {
        const defaults = {
            N8N_HOST: 'localhost',
            N8N_PORT: '5678',
            N8N_PROTOCOL: 'http',
            N8N_USER_FOLDER: './data',
            DB_TYPE: 'sqlite',
            DB_SQLITE_DATABASE: './data/database/n8n.sqlite',
            N8N_SECURE_COOKIE: 'false',
            N8N_ENCRYPTION_KEY: 'portable-n8n-key-change-this',
            N8N_LOG_LEVEL: 'info',
            N8N_LOG_OUTPUT: 'file',
            N8N_LOG_FILE_LOCATION: './data/logs',
            N8N_DISABLE_UI: 'false',
            N8N_SKIP_ASSETS_CACHE: 'true',
            N8N_DEFAULT_BINARY_DATA_MODE: 'filesystem',
            N8N_BINARY_DATA_STORAGE_PATH: './data/binary-data'
        };

        console.log('使用默认配置...');
        for (const [key, value] of Object.entries(defaults)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }

        return defaults;
    }

    static validateEnvironment() {
        const required = ['N8N_HOST', 'N8N_PORT', 'N8N_USER_FOLDER'];
        const missing = [];

        for (const key of required) {
            if (!process.env[key]) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    static displayEnvironmentInfo() {
        console.log();
        console.log('n8n 配置信息:');
        console.log(`  主机地址: ${process.env.N8N_HOST}`);
        console.log(`  端口号:   ${process.env.N8N_PORT}`);
        console.log(`  数据目录: ${process.env.N8N_USER_FOLDER}`);
        console.log(`  数据库:   ${process.env.DB_SQLITE_DATABASE}`);
        console.log();
    }

    static getEnvironmentFilePath() {
        const PlatformUtils = require('./platform');
        const paths = PlatformUtils.getDefaultPaths();
        return path.join(paths.configDir, '.env');
    }

    static createDefaultEnvironmentFile() {
        const envPath = this.getEnvironmentFilePath();
        
        if (fs.existsSync(envPath)) {
            console.log('Environment file already exists:', envPath);
            return false;
        }

        const defaultContent = `# n8n Portable Configuration
# Basic Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http

# Data Storage
N8N_USER_FOLDER=./data
DB_TYPE=sqlite
DB_SQLITE_DATABASE=./data/database/n8n.sqlite

# Security Configuration
N8N_SECURE_COOKIE=false
N8N_ENCRYPTION_KEY=portable-n8n-key-change-this-in-production

# Logging Configuration
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=file
N8N_LOG_FILE_LOCATION=./data/logs

# UI Configuration
N8N_DISABLE_UI=false

# Workflow Configuration
N8N_DEFAULT_BINARY_DATA_MODE=filesystem
N8N_BINARY_DATA_STORAGE_PATH=./data/binary-data

# Performance Optimization
N8N_SKIP_ASSETS_CACHE=true

# Webhook Configuration
WEBHOOK_URL=http://localhost:5678/
`;

        const PlatformUtils = require('./platform');
        const configDir = path.dirname(envPath);
        PlatformUtils.ensureDirectoryExists(configDir);

        fs.writeFileSync(envPath, defaultContent, 'utf8');
        console.log('Created default environment file:', envPath);
        return true;
    }
}

module.exports = EnvUtils;