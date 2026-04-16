#!/bin/bash

# 创建占位符图标的脚本
# 为尚未下载的 AI 提供商创建简单的占位符图标

cd "$(dirname "$0")/images/providers"

# 需要创建占位符的提供商
PROVIDERS=("tongyi" "doubao" "notebooklm" "genspark" "ima")

echo "创建占位符图标..."

for provider in "${PROVIDERS[@]}"; do
    if [ ! -f "${provider}.png" ]; then
        echo "为 ${provider} 创建占位符..."
        # 使用 ImageMagick 创建简单的彩色方块作为占位符
        # 如果没有 ImageMagick，可以手动下载图标
        if command -v convert &> /dev/null; then
            # 随机颜色的占位符
            convert -size 48x48 xc:"#$(openssl rand -hex 3)" "${provider}.png"
        else
            echo "  警告: 未找到 ImageMagick，请手动下载 ${provider}.png"
            echo "  参考 ICON_DOWNLOAD_GUIDE.md 下载图标"
        fi
    else
        echo "${provider}.png 已存在"
    fi
done

echo "完成！请参考 ICON_DOWNLOAD_GUIDE.md 下载正式图标"



