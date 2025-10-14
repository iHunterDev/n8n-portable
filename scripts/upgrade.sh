#!/bin/bash

export NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR/.." || {
    echo "错误: 无法切换到项目根目录"
    exit 1
}

if [ ! -f "bin/node" ]; then
    echo "未检测到 Node.js 运行时，正在自动下载..."
    if ! bash scripts/download-nodejs.sh; then
        echo "错误: Node.js 下载失败"
        exit 1
    fi
fi

bin/node scripts/js/upgrade-n8n.js "$@"
