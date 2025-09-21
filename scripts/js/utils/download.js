const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class DownloadUtils {
    static async downloadFile(url, outputPath, options = {}) {
        const { 
            showProgress = true, 
            timeout = 30000,
            retries = 3 
        } = options;

        console.log(`正在下载: ${url}`);
        console.log(`保存到: ${outputPath}`);

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this._downloadWithProgress(url, outputPath, { showProgress, timeout });
                console.log('下载完成');
                return true;
            } catch (error) {
                console.error(`下载尝试 ${attempt}/${retries} 失败:`, error.message);
                
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                
                if (attempt === retries) {
                    throw error;
                }
                
                console.log(`等待 ${attempt * 1000}ms 后重试...`);
                await this._sleep(attempt * 1000);
            }
        }
    }

    static _downloadWithProgress(url, outputPath, options) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const request = client.get(url, { timeout: options.timeout }, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    console.log(`重定向到: ${redirectUrl}`);
                    this._downloadWithProgress(redirectUrl, outputPath, options)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'], 10);
                let downloadedBytes = 0;
                let lastProgressTime = Date.now();

                const fileStream = fs.createWriteStream(outputPath);

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    fileStream.write(chunk);

                    if (options.showProgress && totalBytes) {
                        const now = Date.now();
                        if (now - lastProgressTime > 1000) {
                            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                            const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
                            const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
                            
                            process.stdout.write(`\r进度: ${progress}% (${downloadedMB}MB / ${totalMB}MB)`);
                            lastProgressTime = now;
                        }
                    }
                });

                response.on('end', () => {
                    fileStream.end();
                    if (options.showProgress) {
                        process.stdout.write('\n');
                    }
                    resolve();
                });

                response.on('error', (error) => {
                    fileStream.destroy();
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                    reject(error);
                });
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('下载超时'));
            });

            request.on('error', (error) => {
                reject(error);
            });
        });
    }

    static async extractArchive(archivePath, extractToDir, options = {}) {
        const { removeAfterExtract = false } = options;
        
        console.log(`正在解压: ${archivePath}`);
        console.log(`解压到: ${extractToDir}`);

        if (!fs.existsSync(extractToDir)) {
            fs.mkdirSync(extractToDir, { recursive: true });
        }

        const ext = path.extname(archivePath).toLowerCase();
        
        try {
            if (ext === '.zip') {
                await this._extractZip(archivePath, extractToDir);
            } else if (ext === '.gz' || ext === '.xz') {
                await this._extractTar(archivePath, extractToDir);
            } else {
                throw new Error(`不支持的压缩格式: ${ext}`);
            }

            console.log('解压完成');

            if (removeAfterExtract && fs.existsSync(archivePath)) {
                fs.unlinkSync(archivePath);
                console.log('已删除压缩包');
            }

        } catch (error) {
            console.error('解压失败:', error.message);
            throw error;
        }
    }

    static async _extractZip(zipPath, extractDir) {
        const { spawn } = require('child_process');
        const PlatformUtils = require('./platform');

        if (PlatformUtils.isWindows) {
            return new Promise((resolve, reject) => {
                const powershellScript = `
                    Add-Type -AssemblyName System.IO.Compression.FileSystem;
                    try {
                        [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/\\/g, '\\\\')}', '${extractDir.replace(/\\/g, '\\\\')}');
                        Write-Host '解压完成';
                    } catch {
                        Write-Host '解压失败:' $_.Exception.Message;
                        exit 1;
                    }
                `;

                const ps = spawn('powershell', ['-Command', powershellScript]);
                
                ps.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`PowerShell 解压失败，退出码: ${code}`));
                    }
                });

                ps.on('error', (error) => {
                    reject(error);
                });
            });
        } else {
            return new Promise((resolve, reject) => {
                const unzip = spawn('unzip', ['-q', zipPath, '-d', extractDir]);
                
                unzip.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`unzip 解压失败，退出码: ${code}`));
                    }
                });

                unzip.on('error', (error) => {
                    reject(error);
                });
            });
        }
    }

    static async _extractTar(tarPath, extractDir) {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const tarArgs = ['xf', tarPath, '-C', extractDir];
            const tar = spawn('tar', tarArgs);
            
            tar.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`tar 解压失败，退出码: ${code}`));
                }
            });

            tar.on('error', (error) => {
                reject(error);
            });
        });
    }

    static _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async verifyFileIntegrity(filePath, expectedSize = null) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        
        if (expectedSize && stats.size !== expectedSize) {
            throw new Error(`文件大小不匹配。期望: ${expectedSize}, 实际: ${stats.size}`);
        }

        return {
            size: stats.size,
            exists: true
        };
    }
}

module.exports = DownloadUtils;