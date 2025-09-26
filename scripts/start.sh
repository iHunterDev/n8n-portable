#!/bin/bash

export NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

# 切换到项目根目录
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR/.." || {
    echo "错误: 无法切换到项目根目录"
    exit 1
}

# 检查Node.js是否存在，如果不存在则自动下载
if [ ! -f "bin/node" ]; then
    echo "未检测到Node.js运行时，正在自动下载..."
    if ! bash scripts/install-node.sh; then
        echo "错误: Node.js下载失败"
        read -p "按任意键继续..."
        exit 1
    fi
fi

# 使用便携版Node.js运行启动脚本，并传递所有参数
bin/node scripts/js/start.js "$@"
