#!/usr/bin/env node

const PlatformUtils = require('./utils/platform');
const ProcessUtils = require('./utils/process');

class N8nStopper {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
    }

    async run() {
        try {
            console.log('=======================================');
            console.log('           停止 n8n 便携版');
            console.log('=======================================');

            await this.stopN8nProcesses();

            console.log('=======================================');
            console.log('n8n 已停止');
            console.log('=======================================');

            return 0;

        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        }
    }

    async stopN8nProcesses() {
        console.log('正在停止 n8n...');

        // 尝试多种方式停止 n8n 进程
        const stopMethods = [
            () => this.stopByProcessName('node.exe'),
            () => this.stopByProcessName('node'),
            () => this.stopByCommandLine('n8n'),
            () => this.stopByPort()
        ];

        let stopped = false;

        for (const method of stopMethods) {
            try {
                const result = await method();
                if (result) {
                    stopped = true;
                    break;
                }
            } catch (error) {
                // 继续尝试下一种方法
                console.log(`停止方法失败: ${error.message}`);
            }
        }

        if (!stopped) {
            console.log('未找到运行中的 n8n 进程');
        }

        // 等待一段时间确保进程完全停止
        await this.waitForProcessStop();
    }

    async stopByProcessName(processName) {
        console.log(`尝试通过进程名停止: ${processName}`);

        if (PlatformUtils.isWindows) {
            return await this.stopWindowsProcess(processName);
        } else {
            return await this.stopUnixProcess(processName);
        }
    }

    async stopWindowsProcess(processName) {
        try {
            // 首先检查是否有相关进程
            const checkResult = await ProcessUtils.runCommandWithOutput('tasklist', [
                '/FI', `IMAGENAME eq ${processName}`,
                '/FO', 'CSV'
            ], { showCommand: false });

            if (!checkResult.stdout.includes(processName)) {
                return false;
            }

            // 尝试优雅停止
            try {
                await ProcessUtils.runCommand('taskkill', ['/IM', processName], {
                    showCommand: false,
                    timeout: 5000
                });
                console.log(`${processName} 已优雅停止`);
                return true;
            } catch (error) {
                // 如果优雅停止失败，强制终止
                console.log('优雅停止失败，尝试强制终止...');
                await ProcessUtils.runCommand('taskkill', ['/F', '/IM', processName], {
                    showCommand: false,
                    timeout: 5000
                });
                console.log(`${processName} 已强制停止`);
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    async stopUnixProcess(processName) {
        try {
            // 查找进程
            const result = await ProcessUtils.runCommandWithOutput('pgrep', ['-f', processName], {
                showCommand: false
            });

            if (!result.success || !result.stdout.trim()) {
                return false;
            }

            const pids = result.stdout.trim().split('\n').filter(pid => pid.trim());

            if (pids.length === 0) {
                return false;
            }

            // 尝试优雅停止
            for (const pid of pids) {
                try {
                    await ProcessUtils.runCommand('kill', ['-TERM', pid], {
                        showCommand: false,
                        timeout: 3000
                    });
                } catch (error) {
                    // 忽略单个进程停止失败
                }
            }

            // 等待一段时间
            await this.sleep(2000);

            // 检查是否还有进程运行
            const checkResult = await ProcessUtils.runCommandWithOutput('pgrep', ['-f', processName], {
                showCommand: false
            });

            if (checkResult.success && checkResult.stdout.trim()) {
                // 强制终止剩余进程
                console.log('优雅停止失败，尝试强制终止...');
                for (const pid of pids) {
                    try {
                        await ProcessUtils.runCommand('kill', ['-KILL', pid], {
                            showCommand: false,
                            timeout: 3000
                        });
                    } catch (error) {
                        // 忽略单个进程停止失败
                    }
                }
            }

            console.log(`${processName} 进程已停止`);
            return true;

        } catch (error) {
            return false;
        }
    }

    async stopByCommandLine(commandPattern) {
        console.log(`尝试通过命令行模式停止: ${commandPattern}`);

        try {
            if (PlatformUtils.isWindows) {
                // Windows: 使用 wmic 查找包含特定命令行的进程
                const result = await ProcessUtils.runCommandWithOutput('wmic', [
                    'process', 'where', `CommandLine like '%${commandPattern}%'`,
                    'get', 'ProcessId', '/value'
                ], { showCommand: false });

                if (result.success && result.stdout.includes('ProcessId=')) {
                    const lines = result.stdout.split('\n');
                    for (const line of lines) {
                        if (line.includes('ProcessId=')) {
                            const pid = line.split('=')[1].trim();
                            if (pid && pid !== '0') {
                                try {
                                    await ProcessUtils.runCommand('taskkill', ['/F', '/PID', pid], {
                                        showCommand: false
                                    });
                                    console.log(`已停止进程 PID: ${pid}`);
                                    return true;
                                } catch (error) {
                                    // 继续尝试其他进程
                                }
                            }
                        }
                    }
                }
            } else {
                // Unix: 使用 pkill
                const result = await ProcessUtils.runCommand('pkill', ['-f', commandPattern], {
                    showCommand: false
                });
                
                if (result === 0) {
                    console.log(`已停止包含 '${commandPattern}' 的进程`);
                    return true;
                }
            }
        } catch (error) {
            // 方法失败，返回 false
        }

        return false;
    }

    async stopByPort() {
        const port = process.env.N8N_PORT || '5678';
        console.log(`尝试通过端口停止: ${port}`);

        try {
            if (PlatformUtils.isWindows) {
                // Windows: 使用 netstat 找到占用端口的进程
                const result = await ProcessUtils.runCommandWithOutput('netstat', [
                    '-ano', '|', 'findstr', `:${port}`
                ], { showCommand: false });

                if (result.success && result.stdout.trim()) {
                    const lines = result.stdout.split('\n');
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 5) {
                            const pid = parts[parts.length - 1];
                            if (pid && pid !== '0') {
                                try {
                                    await ProcessUtils.runCommand('taskkill', ['/F', '/PID', pid], {
                                        showCommand: false
                                    });
                                    console.log(`已停止占用端口 ${port} 的进程 PID: ${pid}`);
                                    return true;
                                } catch (error) {
                                    // 继续尝试
                                }
                            }
                        }
                    }
                }
            } else {
                // Unix: 使用 lsof 或 ss
                try {
                    const result = await ProcessUtils.runCommandWithOutput('lsof', ['-ti', `:${port}`], {
                        showCommand: false
                    });

                    if (result.success && result.stdout.trim()) {
                        const pids = result.stdout.trim().split('\n');
                        for (const pid of pids) {
                            if (pid.trim()) {
                                try {
                                    await ProcessUtils.runCommand('kill', ['-TERM', pid.trim()], {
                                        showCommand: false
                                    });
                                    console.log(`已停止占用端口 ${port} 的进程 PID: ${pid}`);
                                    return true;
                                } catch (error) {
                                    // 继续尝试
                                }
                            }
                        }
                    }
                } catch (error) {
                    // lsof 不可用，尝试其他方法
                }
            }
        } catch (error) {
            // 方法失败
        }

        return false;
    }

    async waitForProcessStop() {
        console.log('等待进程完全停止...');
        
        // 等待 2 秒
        await this.sleep(2000);
        
        // 验证进程是否真的停止了
        const isStillRunning = await ProcessUtils.isProcessRunning('node');
        
        if (isStillRunning) {
            console.log('警告: 可能还有 Node.js 进程在运行');
        } else {
            console.log('所有相关进程已停止');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const stopper = new N8nStopper();
    
    stopper.run()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = N8nStopper;