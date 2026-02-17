#!/bin/bash
# 同步规则文件：从项目目录到 Windsurf 系统配置目录

SOURCE_DIR="/Users/apple/cunzhi/.cunzhi-knowledge/rules"
TARGET_DIR="/Users/apple/.codeium/windsurf/rules"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔄 同步规则文件..."
echo "源目录: $SOURCE_DIR"
echo "目标目录: $TARGET_DIR"
echo ""

# 检查源目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 错误：源目录不存在"
    exit 1
fi

# 确保目标目录存在
mkdir -p "$TARGET_DIR"

# 同步所有规则文件
for file in "$SOURCE_DIR"/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$TARGET_DIR/$filename"
        echo -e "${GREEN}✓${NC} 已同步: $filename"
    fi
done

echo ""
echo -e "${GREEN}✅ 同步完成！${NC}"
echo ""
echo "提示：规则文件修改后，运行以下命令同步："
echo -e "${YELLOW}bash .cunzhi-knowledge/sync-rules.sh${NC}"
