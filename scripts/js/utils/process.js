const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProcessUtils {
    static async runCommand(command, args = [], options = {}) {
        const {
            cwd = process.cwd(),
            stdio = 'inherit',
            timeout = 0,
            showCommand = true
        } = options;

        if (showCommand) {
            console.log(`执行命令: ${command} ${args.join(' ')}`);
        }

        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                stdio,
                shell: true,
                ...options
            });

            let timeoutId;
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
                    reject(new Error(`命令执行超时 (${timeout}ms)`));
                }, timeout);
            }

            child.on('close', (code) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`命令执行失败，退出码: ${code}`));
                }
            });

            child.on('error', (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    static async runCommandWithOutput(command, args = [], options = {}) {
        const {
            cwd = process.cwd(),
            timeout = 30000,
            showCommand = true
        } = options;

        if (showCommand) {
            console.log(`执行命令: ${command} ${args.join(' ')}`);
        }

        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                stdio: 'pipe',
                shell: true,
                ...options
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            let timeoutId;
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
                    reject(new Error(`命令执行超时 (${timeout}ms)`));
                }, timeout);
            }

            child.on('close', (code) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                resolve({
                    code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    success: code === 0
                });
            });

            child.on('error', (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    static async killProcessByName(processName, options = {}) {
        const PlatformUtils = require('./platform');
        const { force = true, timeout = 5000 } = options;

        console.log(`正在停止进程: ${processName}`);

        try {
            const killCmd = PlatformUtils.getProcessKillCommand(processName);
            
            if (force && PlatformUtils.isWindows) {
                // Windows: 强制终止
                await this.runCommand(killCmd.command, killCmd.args, { 
                    showCommand: false,
                    timeout 
                });
            } else if (PlatformUtils.isWindows) {
                // Windows: 优雅终止
                await this.runCommand('taskkill', ['/im', processName], { 
                    showCommand: false,
                    timeout 
                });
            } else {
                // Unix-like: 先尝试SIGTERM，再尝试SIGKILL
                try {
                    await this.runCommand('pkill', ['-TERM', '-f', processName], { 
                        showCommand: false,
                        timeout: timeout / 2 
                    });
                    
                    // 等待一段时间让进程优雅退出
                    await this._sleep(2000);
                    
                    // 检查进程是否还在运行
                    const stillRunning = await this.isProcessRunning(processName);
                    if (stillRunning && force) {
                        console.log('优雅终止失败，强制终止进程...');
                        await this.runCommand('pkill', ['-KILL', '-f', processName], { 
                            showCommand: false,
                            timeout: timeout / 2 
                        });
                    }
                } catch (error) {
                    if (force) {
                        await this.runCommand('pkill', ['-KILL', '-f', processName], { 
                            showCommand: false,
                            timeout: timeout / 2 
                        });
                    } else {
                        throw error;
                    }
                }
            }

            console.log(`${processName} 已停止`);
            return true;

        } catch (error) {
            console.log(`停止 ${processName} 时出错: ${error.message}`);
            return false;
        }
    }

    static async isProcessRunning(processName) {
        const PlatformUtils = require('./platform');

        try {
            if (PlatformUtils.isWindows) {
                const result = await this.runCommandWithOutput('tasklist', ['/FI', `IMAGENAME eq ${processName}*`], {
                    showCommand: false
                });
                return result.stdout.includes(processName);
            } else {
                const result = await this.runCommandWithOutput('pgrep', ['-f', processName], {
                    showCommand: false
                });
                return result.code === 0 && result.stdout.length > 0;
            }
        } catch (error) {
            return false;
        }
    }

    static async waitForFile(filePath, timeout = 30000, interval = 1000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (fs.existsSync(filePath)) {
                return true;
            }
            await this._sleep(interval);
        }
        
        throw new Error(`等待文件超时: ${filePath}`);
    }

    static async waitForProcess(processName, timeout = 30000, shouldExist = true) {
        const startTime = Date.now();
        const interval = 1000;
        
        while (Date.now() - startTime < timeout) {
            const isRunning = await this.isProcessRunning(processName);
            
            if (shouldExist && isRunning) {
                return true;
            } else if (!shouldExist && !isRunning) {
                return true;
            }
            
            await this._sleep(interval);
        }
        
        const action = shouldExist ? '启动' : '停止';
        throw new Error(`等待进程${action}超时: ${processName}`);
    }

    static async checkExecutableExists(executablePath) {
        if (!fs.existsSync(executablePath)) {
            return false;
        }

        try {
            const stats = fs.statSync(executablePath);
            return stats.isFile();
        } catch (error) {
            return false;
        }
    }

    static async getExecutableVersion(executablePath, versionArg = '--version') {
        try {
            const result = await this.runCommandWithOutput(executablePath, [versionArg], {
                showCommand: false,
                timeout: 10000
            });

            if (result.success) {
                return result.stdout || result.stderr;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    static _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static createLockFile(lockPath, content = '') {
        const lockDir = path.dirname(lockPath);
        if (!fs.existsSync(lockDir)) {
            fs.mkdirSync(lockDir, { recursive: true });
        }
        
        const lockContent = content || JSON.stringify({
            pid: process.pid,
            timestamp: new Date().toISOString(),
            command: process.argv.join(' ')
        });
        
        fs.writeFileSync(lockPath, lockContent);
    }

    static removeLockFile(lockPath) {
        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
        }
    }

    static isLockFileValid(lockPath) {
        if (!fs.existsSync(lockPath)) {
            return false;
        }

        try {
            const lockContent = fs.readFileSync(lockPath, 'utf8');
            const lockData = JSON.parse(lockContent);
            
            // 检查PID是否还存在
            try {
                process.kill(lockData.pid, 0);
                return true;
            } catch (error) {
                // 进程不存在，删除无效的锁文件
                this.removeLockFile(lockPath);
                return false;
            }
        } catch (error) {
            // 无法解析锁文件，删除它
            this.removeLockFile(lockPath);
            return false;
        }
    }
}

module.exports = ProcessUtils;