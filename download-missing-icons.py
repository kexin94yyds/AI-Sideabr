#!/usr/bin/env python3
"""
下载缺失的 AI 提供商图标

使用方法:
1. 访问 https://lobehub.com/zh/icons
2. 手动下载以下图标并保存到 images/providers/ 目录:
   - tongyi.png (通义千问)
   - doubao.png (豆包)
   - notebooklm.png (NotebookLM)
   - genspark.png (Genspark)
   - ima.png (腾讯元宝)

或者运行此脚本创建临时占位符图标
"""

import os
from PIL import Image, ImageDraw, ImageFont
import sys

# 图标配置
ICONS = {
    'tongyi': {'name': '通义', 'color': '#6B46F2'},
    'doubao': {'name': '豆包', 'color': '#FF6B35'},
    'notebooklm': {'name': 'NLM', 'color': '#4285F4'},
    'genspark': {'name': 'GS', 'color': '#00D4AA'},
    'ima': {'name': 'IMA', 'color': '#07C160'}
}

def create_placeholder_icon(name, text, color, size=48):
    """创建一个简单的占位符图标"""
    # 创建带圆角的正方形
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制圆角矩形背景
    draw.rounded_rectangle(
        [(2, 2), (size-2, size-2)],
        radius=8,
        fill=color
    )
    
    # 添加文字
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 20)
    except:
        # 如果失败，使用默认字体
        font = ImageFont.load_default()
    
    # 计算文字位置（居中）
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - 2
    
    # 绘制白色文字
    draw.text((x, y), text, fill='white', font=font)
    
    return img

def main():
    # 确定目标目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(script_dir, 'images', 'providers')
    
    if not os.path.exists(target_dir):
        print(f"错误: 目录 {target_dir} 不存在")
        return
    
    print("🎨 创建占位符图标...\n")
    
    created_count = 0
    skipped_count = 0
    
    for key, config in ICONS.items():
        filename = f"{key}.png"
        filepath = os.path.join(target_dir, filename)
        
        if os.path.exists(filepath):
            print(f"⏭️  {filename} 已存在，跳过")
            skipped_count += 1
            continue
        
        # 创建图标
        img = create_placeholder_icon(config['name'], config['name'], config['color'])
        img.save(filepath, 'PNG')
        print(f"✅ 创建 {filename} (颜色: {config['color']})")
        created_count += 1
    
    print(f"\n完成! 创建了 {created_count} 个图标，跳过了 {skipped_count} 个")
    print("\n⚠️  这些是临时占位符图标，建议从以下网站下载正式图标:")
    print("   https://lobehub.com/zh/icons")
    print("\n💡 下载后替换 images/providers/ 目录中的对应文件即可")

if __name__ == '__main__':
    try:
        from PIL import Image, ImageDraw, ImageFont
        main()
    except ImportError:
        print("❌ 需要安装 Pillow 库")
        print("   运行: pip3 install Pillow")
        print("\n或者手动下载图标:")
        print("   1. 访问 https://lobehub.com/zh/icons")
        print("   2. 搜索并下载以下图标:")
        for key, config in ICONS.items():
            print(f"      - {key}.png ({config['name']})")
        print("   3. 保存到 images/providers/ 目录")



