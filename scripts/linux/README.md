# Linux 启动脚本 - TODO

## 计划功能
此目录将包含 Linux 平台的启动脚本。

## 待实现的脚本:
- `start.sh` - 启动 n8n
- `stop.sh` - 停止 n8n  
- `download-nodejs.sh` - 下载 Node.js
- `install-n8n.sh` - 安装 n8n
- `load-env.sh` - 加载环境变量
- `backup.sh` - 备份数据
- `install-nodes.sh` - 安装第三方节点

## 实现说明
这些脚本将调用 `scripts/js/` 目录中对应的 JavaScript 脚本，提供与 Windows 版本相同的功能。

## 开发优先级
当前优先级: **低**
需要在 Windows 版本稳定后再进行开发。

## 使用方式 (计划)
```bash
# 启动 n8n
./scripts/linux/start.sh

# 停止 n8n  
./scripts/linux/stop.sh

# 下载 Node.js
./scripts/linux/download-nodejs.sh

# 安装 n8n
./scripts/linux/install-n8n.sh
```