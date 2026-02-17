#!/bin/bash
# 备份 AI Sidebar 的同步数据（history.json / favorites.json）
# 同时备份：
#   1) Chrome 插件工程的 sync/ 目录
#   2) AI 应用（Electron）工程的 sync/ 目录
#
# 使用方法：
#   cd "/Users/apple/AI-sidebar 更新/AI-Sidebar"
#   chmod +x backup-sync.sh   # 只需第一次
#   ./backup-sync.sh

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# 两个工程的根目录
EXT_DIR="$BASE_DIR"
APP_DIR="/Users/apple/全局 ai 侧边栏/AI-Sidebar"

TS="$(date +'%Y-%m-%d_%H-%M-%S')"

backup_one() {
  local project_dir="$1"
  local label="$2"           # app / extension

  if [ ! -d "$project_dir" ]; then
    echo "跳过 [$label]：目录不存在：$project_dir"
    return
  fi

  local sync_dir="$project_dir/sync"
  if [ ! -d "$sync_dir" ]; then
    echo "跳过 [$label]：未找到 sync 目录：$sync_dir"
    return
  fi

  local backup_dir="$BASE_DIR/sync-backups/$label"
  mkdir -p "$backup_dir"

  for name in history favorites; do
    local src="$sync_dir/$name.json"
    if [ -f "$src" ]; then
      local dest="$backup_dir/${name}_${TS}.json"
      cp "$src" "$dest"
      echo "[$label] 已备份 $name.json -> sync-backups/$label/$(basename "$dest")"
    else
      echo "[$label] 跳过 $name.json（文件不存在：$src）"
    fi
  done
}

echo "==== 开始备份 sync 数据：$TS ===="
backup_one "$APP_DIR" "app"
backup_one "$EXT_DIR" "extension"
echo "==== 备份完成 ===="

