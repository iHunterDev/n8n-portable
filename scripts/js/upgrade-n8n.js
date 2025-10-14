#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const readline = require('readline');
const PlatformUtils = require('./utils/platform');
const N8nInstaller = require('./install-n8n');

class N8nUpgrader {
    constructor() {
        this.paths = PlatformUtils.getDefaultPaths();
        this.releasesApiUrl = 'https://api.github.com/repos/n8n-io/n8n/releases';
        this.readlineInterface = null;
    }

    async run() {
        try {
            console.log('=======================================');
            console.log('           n8n 便携版 升级器');
            console.log('=======================================');
            console.log();

            this.ensureNodeRuntime();

            const installedVersion = await N8nInstaller.getInstalledVersion(this.paths);
            if (installedVersion) {
                console.log(`当前安装版本: ${installedVersion}`);
            } else {
                console.log('未检测到已安装的 n8n，将执行全新安装');
            }
            console.log();

            const availableReleases = await this.fetchStableReleases();
            if (availableReleases.length === 0) {
                console.log('无法从 GitHub 获取可用版本，请输入要安装的版本号 (例如: 1.111.1)');
                const manualVersion = await this.promptManualVersion();
                if (!manualVersion) {
                    console.log('未提供版本号，升级已取消');
                    return 1;
                }
                return this.installTargetVersion(manualVersion, installedVersion);
            }

            const targetVersion = await this.askForTargetVersion(availableReleases);
            if (!targetVersion) {
                console.log('升级已取消');
                return 1;
            }

            return this.installTargetVersion(targetVersion, installedVersion);
        } catch (error) {
            console.error('错误:', error.message);
            return 1;
        } finally {
            this.closeReadline();
        }
    }

    ensureNodeRuntime() {
        if (!fs.existsSync(this.paths.nodeExecutable)) {
            throw new Error('Node.js 运行时不存在。请先运行 scripts/download-nodejs.* 下载安装 Node.js');
        }
    }

    async fetchStableReleases() {
        try {
            const response = await this.requestGithubApi(this.releasesApiUrl);
            const releases = JSON.parse(response);

            return releases
                .filter(release => !release.draft && !release.prerelease)
                .map(release => ({
                    version: this.normalizeVersionTag(release.tag_name),
                    tag: release.tag_name,
                    name: release.name || release.tag_name,
                    publishedAt: release.published_at,
                    body: release.body || ''
                }));
        } catch (error) {
            console.error(`获取发布列表失败: ${error.message}`);
            return [];
        }
    }

    requestGithubApi(url) {
        return new Promise((resolve, reject) => {
            const headers = {
                'User-Agent': 'n8n-portable-upgrader',
                'Accept': 'application/vnd.github+json'
            };

            const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const request = https.get(url, { headers, timeout: 15000 }, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`GitHub API 返回状态 ${response.statusCode}`));
                    response.resume();
                    return;
                }

                let rawData = '';
                response.setEncoding('utf8');

                response.on('data', chunk => {
                    rawData += chunk;
                });

                response.on('end', () => resolve(rawData));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('请求 GitHub API 超时'));
            });

            request.on('error', reject);
        });
    }

    normalizeVersionTag(tagName) {
        if (typeof tagName !== 'string') {
            return '';
        }
        return tagName.startsWith('v') ? tagName.slice(1) : tagName;
    }

    async askForTargetVersion(releases) {
        const latest = releases[0];
        const options = releases.slice(0, 10); // 提供最近 10 个版本以供选择

        console.log('可用稳定版本:');
        options.forEach((release, index) => {
            const label = `[${index + 1}] ${release.version}`;
            const suffix = index === 0 ? ' (最新)' : '';
            console.log(`  ${label}${suffix}`);
        });
        console.log();
        console.log('按 Enter 直接升级到最新版本，或输入对应序号/版本号。输入 q 取消升级。');

        const answer = await this.prompt(`请选择目标版本 [1-${options.length}] (默认: ${latest.version}): `);
        if (!answer) {
            return latest.version;
        }

        if (answer.toLowerCase() === 'q') {
            return null;
        }

        const numericChoice = Number.parseInt(answer, 10);
        if (!Number.isNaN(numericChoice) && numericChoice >= 1 && numericChoice <= options.length) {
            return options[numericChoice - 1].version;
        }

        // 允许用户直接输入版本号
        const normalized = this.normalizeVersionTag(answer);
        const exists = releases.find(release => release.version === normalized);
        if (!exists) {
            const confirm = await this.prompt(`版本 ${normalized} 未在列表中，确认继续安装该版本吗? (y/N): `);
            if (confirm.toLowerCase() === 'y') {
                return normalized;
            }
            return null;
        }

        return normalized;
    }

    async promptManualVersion() {
        const answer = await this.prompt('请输入要安装的 n8n 版本 (或按 Enter 取消): ');
        if (!answer) {
            return null;
        }
        return this.normalizeVersionTag(answer.trim());
    }

    async installTargetVersion(targetVersion, installedVersion) {
        if (installedVersion && installedVersion === targetVersion) {
            console.log(`当前已安装版本 ${installedVersion} 与目标版本一致，无需升级`);
            return 0;
        }

        console.log(`目标版本: ${targetVersion}`);
        console.log('开始安装/升级...');
        console.log();

        const installer = new N8nInstaller();
        const exitCode = await installer.run([targetVersion]);

        if (exitCode === 0) {
            console.log();
            console.log('升级完成!');
        }

        return exitCode;
    }

    prompt(question) {
        if (!this.readlineInterface) {
            this.readlineInterface = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }

        return new Promise(resolve => {
            this.readlineInterface.question(question, answer => {
                resolve(answer.trim());
            });
        });
    }

    closeReadline() {
        if (this.readlineInterface) {
            this.readlineInterface.close();
            this.readlineInterface = null;
        }
    }
}

if (require.main === module) {
    const upgrader = new N8nUpgrader();
    upgrader.run()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = N8nUpgrader;
