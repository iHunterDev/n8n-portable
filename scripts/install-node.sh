#!/bin/bash

# 默认 Node.js 版本
DEFAULT_NODE_VERSION="22.16.0"

# 从参数获取 Node.js 版本或使用默认值
if [ $# -eq 0 ]; then
    NODE_VERSION="$DEFAULT_NODE_VERSION"
    echo "使用默认 Node.js 版本: $NODE_VERSION"
else
    NODE_VERSION="$1"
    echo "使用指定 Node.js 版本: $NODE_VERSION"
fi

# 切换到项目根目录（脚本需放在项目的子目录中，此命令自动定位到上级根目录）
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR/.." || {
    echo "错误: 无法切换到项目根目录"
    exit 1
}

# 检查 Node.js 是否已存在
if [ -f "bin/node" ]; then
    echo "检测到已存在的 Node.js 运行时"
    # 提取当前版本（去除版本号前的 "v" 前缀）
    CURRENT_VERSION=$("bin/node" --version 2>/dev/null | sed 's/v//')
    if [ -n "$CURRENT_VERSION" ]; then
        echo "当前版本: $CURRENT_VERSION"
        # 对比版本号，若一致则无需重复下载
        if [ "$CURRENT_VERSION" = "$NODE_VERSION" ]; then
            echo "Node.js 版本已是最新，无需下载"
            exit 0
        else
            echo "版本不匹配，将下载新版本"
        fi
    fi
fi

echo "======================================="
echo "      下载 Node.js 便携版 v$NODE_VERSION"
echo "======================================="

# 创建临时目录（若不存在则自动创建）
mkdir -p temp

# 确定系统架构
if [ "$(uname -m)" = "arm64" ]; then
    NODE_ARCH="arm64"
else
    NODE_ARCH="x64"
fi

# https://nodejs.org/dist/v
NODEJS_RELEASE_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v

DOWNLOAD_URL="$NODEJS_RELEASE_MIRROR$NODE_VERSION/node-v$NODE_VERSION-darwin-$NODE_ARCH.tar.gz"
TAR_FILE="temp/node-v$NODE_VERSION-darwin-$NODE_ARCH.tar.gz"

echo "正在下载 Node.js v$NODE_VERSION..."
echo "下载地址: $DOWNLOAD_URL"

# 使用 curl 工具下载文件（-f 表示下载失败时返回错误，-L 支持自动跳转）
if ! curl -fL "$DOWNLOAD_URL" -o "$TAR_FILE"; then
    echo "错误: 下载失败（可能是版本号不存在或网络问题）"
    exit 1
fi

echo "正在解压 Node.js 压缩包..."

# 清理旧版本（若已存在 bin 目录则强制删除）
if [ -d "bin" ]; then
    echo "清理旧版本 Node.js 文件..."
    rm -rf "bin"
fi

if [ -d "lib" ]; then
    echo "清理旧版本 Node.js 文件..."
    rm -rf "lib"
fi

# 解压 tar.gz 压缩包（-z 处理 gzip 格式，-x 解压，-f 指定文件，-C 指定解压目录）
if ! tar -zxf "$TAR_FILE" -C temp; then
    echo "错误: 解压失败（可能是压缩包损坏）"
    exit 1
fi

mkdir -p bin
mkdir -p lib

# 将解压后的文件移动到 bin 目录（适配原脚本的目录结构）
EXTRACTED_DIR="temp/node-v$NODE_VERSION-darwin-$NODE_ARCH"
if [ -d "$EXTRACTED_DIR" ]; then
# 复制 lib 目录
    cp -r "$EXTRACTED_DIR/lib/"* "lib/"
    
    # 复制 bin 目录中的实际文件（不包括软链接）
    find "$EXTRACTED_DIR/bin/" -maxdepth 1 -type f -exec cp {} "bin/" \;
    
    # 处理 npm 软链接
    if [ -L "$EXTRACTED_DIR/bin/npm" ]; then
        NEW_NPM_PATH="$PWD/lib/node_modules/npm/bin/npm-cli.js"
        echo "重新创建 npm 链接: $NEW_NPM_PATH"
        ln -s "$NEW_NPM_PATH" "bin/npm"
    fi

    # 处理 npx 软链接
    if [ -L "$EXTRACTED_DIR/bin/npx" ]; then
        NEW_NPX_PATH="$PWD/lib/node_modules/npm/bin/npx-cli.js"
        echo "重新创建 npx 链接: $NEW_NPX_PATH"
        ln -s "$NEW_NPX_PATH" "bin/npx"
    fi

    # 处理 corepack 软链接
    if [ -L "$EXTRACTED_DIR/bin/corepack" ]; then
        # Corepack 通常位于 lib/node_modules/corepack/dist/corepack.js
        NEW_COREPACK_PATH="$PWD/lib/node_modules/corepack/dist/corepack.js"
        echo "重新创建 corepack 链接: $NEW_COREPACK_PATH"
        ln -s "$NEW_COREPACK_PATH" "bin/corepack"
        
        # 验证 corepack 路径是否存在
        if [ ! -f "$NEW_COREPACK_PATH" ]; then
            echo "警告: 未找到 corepack 实际文件，可能需要手动安装"
        fi
    fi

    echo "Node.js 便携版安装完成"
else
    echo "错误: 解压后未找到预期的目录（路径：$EXTRACTED_DIR）"
    exit 1
fi

# 清理临时文件（删除下载的压缩包和空的临时目录）
rm -f "$TAR_FILE"
rm -rf "$EXTRACTED_DIR"

# 验证安装结果（检查 node 可执行文件是否存在）
if [ -f "bin/node" ]; then
    echo "======================================="
    echo "Node.js 下载安装成功!"
    echo "Node 版本: $(bin/node --version)"
    echo "npm 版本: $(bin/npm --version)"
    echo "======================================="
else
    echo "错误: Node.js 安装失败（未找到 bin/node 可执行文件）"
    exit 1
fi
