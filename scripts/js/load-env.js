#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./utils/platform');
const EnvUtils = require('./utils/env');

class EnvLoader {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
        this.envFilePath = path.join(this.paths.configDir, '.env');
    }

    async run() {
        try {
            console.log('=======================================');
            console.log('     环境变量加载器 - 安全增强版');
            console.log('=======================================');

            if (!fs.existsSync(this.envFilePath)) {
                console.error(`错误: 环境配置文件不存在: ${this.envFilePath}`);
                console.log('请确保 config/.env 文件存在');
                return 1;
            }

            console.log(`正在从 ${this.envFilePath} 加载环境变量...`);
            console.log();

            const result = this.loadEnvironmentVariables();

            console.log();
            if (result.count > 0) {
                console.log(`成功: 加载了 ${result.count} 个环境变量。`);
            } else {
                console.log('警告: .env 文件中没有找到有效的环境变量。');
                console.log('检查文件格式: 每行应为 VARIABLE_NAME=value');
            }

            return 0;

        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        }
    }

    loadEnvironmentVariables() {
        const envContent = fs.readFileSync(this.envFilePath, 'utf8');
        const lines = envContent.split('\n');
        
        let varCount = 0;
        const loadedVariables = {};

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            // 检查行是否包含等号且不是以等号开头
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex <= 0) {
                console.log(`跳过: "${trimmedLine}" (格式无效)`);
                continue;
            }

            const varName = trimmedLine.substring(0, equalIndex).trim();
            const varValue = trimmedLine.substring(equalIndex + 1).trim();

            // 移除变量名可能的空格
            const cleanVarName = varName.replace(/\s+/g, '');

            // 移除值周围的引号
            let cleanValue = this.removeQuotes(varValue);

            // 自动转换路径相关的环境变量为绝对路径
            if (this.isPathVariable(cleanVarName)) {
                cleanValue = this.convertToAbsolutePath(cleanValue);
            }

            // 安全地设置环境变量
            process.env[cleanVarName] = cleanValue;
            loadedVariables[cleanVarName] = cleanValue;

            // 显示设置信息（保护敏感信息）
            if (this.isSensitiveVariable(cleanVarName)) {
                console.log(`  设置: ${cleanVarName}=******`);
            } else {
                console.log(`  设置: ${cleanVarName}=${cleanValue}`);
            }

            varCount++;
        }

        return {
            count: varCount,
            variables: loadedVariables
        };
    }

    removeQuotes(value) {
        // 移除单引号或双引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        return value;
    }

    isSensitiveVariable(varName) {
        const sensitivePatterns = [
            'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PASS',
            'ENCRYPTION', 'SMTP', 'AUTH', 'CREDENTIAL'
        ];
        
        const upperVarName = varName.toUpperCase();
        return sensitivePatterns.some(pattern => upperVarName.includes(pattern));
    }

    isPathVariable(varName) {
        const pathPatterns = [
            'FOLDER', 'PATH', 'DIR', 'DIRECTORY', 'FILE', 'LOCATION',
            'DATABASE', 'STORAGE', 'LOG'
        ];
        
        const upperVarName = varName.toUpperCase();
        return pathPatterns.some(pattern => upperVarName.includes(pattern));
    }

    convertToAbsolutePath(value) {
        // 如果已经是绝对路径，直接返回
        if (path.isAbsolute(value)) {
            return value;
        }

        // 如果是空值或URL，不转换
        if (!value || value.startsWith('http://') || value.startsWith('https://')) {
            return value;
        }

        // 只转换明显是路径的值（包含路径分隔符或以.开头）
        if (!value.includes('/') && !value.includes('\\') && !value.startsWith('.')) {
            return value;
        }

        // 将相对路径转换为绝对路径（相对于项目根目录）
        const projectRoot = path.resolve(__dirname, '../..');
        const absolutePath = path.resolve(projectRoot, value);
        
        console.log(`  路径转换: ${value} -> ${absolutePath}`);
        return absolutePath;
    }

    static validateEnvFile(envFilePath) {
        if (!fs.existsSync(envFilePath)) {
            return {
                valid: false,
                error: '环境配置文件不存在'
            };
        }

        try {
            const content = fs.readFileSync(envFilePath, 'utf8');
            const lines = content.split('\n');
            let validLines = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    if (trimmed.includes('=') && !trimmed.startsWith('=')) {
                        validLines++;
                    }
                }
            }

            return {
                valid: true,
                lineCount: lines.length,
                validVariables: validLines
            };
        } catch (error) {
            return {
                valid: false,
                error: `读取文件失败: ${error.message}`
            };
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const loader = new EnvLoader();
    
    loader.run()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = EnvLoader;