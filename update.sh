#!/bin/bash

# One-API 更新脚本
# 以远程仓库为准强制拉取最新代码，保留本地配置文件

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step()    { echo -e "${BLUE}[步骤]${NC} $1"; }
print_success() { echo -e "${GREEN}[成功]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[注意]${NC} $1"; }
print_error()   { echo -e "${RED}[错误]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 需要保留的配置文件列表
CONFIG_FILES=(.env)
BACKUP_DIR="/tmp/one-api-config-backup-$$"

echo "========================================="
echo "One-API 更新脚本"
echo "========================================="
echo ""

# 备份配置文件
print_step "备份配置文件..."
mkdir -p "$BACKUP_DIR"
BACKED_UP=()
for f in "${CONFIG_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$f" ]; then
        cp "$PROJECT_ROOT/$f" "$BACKUP_DIR/$f"
        BACKED_UP+=("$f")
        print_success "已备份: $f"
    fi
done

if [ ${#BACKED_UP[@]} -eq 0 ]; then
    print_warning "未找到配置文件，将直接更新代码"
fi

# 拉取远程最新代码（以远程为准，丢弃本地修改）
print_step "拉取最新代码..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_warning "当前分支: $CURRENT_BRANCH"

git fetch origin
OLD_COMMIT=$(git rev-parse HEAD)
git reset --hard "origin/${CURRENT_BRANCH}"
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    print_success "代码已是最新，无需更新 ($(git log -1 --format='%h %s'))"
else
    echo ""
    echo "更新内容："
    git log --oneline "${OLD_COMMIT}..${NEW_COMMIT}"
    echo ""
fi

# 恢复配置文件
if [ ${#BACKED_UP[@]} -gt 0 ]; then
    print_step "恢复配置文件..."
    for f in "${BACKED_UP[@]}"; do
        cp "$BACKUP_DIR/$f" "$PROJECT_ROOT/$f"
        print_success "已恢复: $f"
    done
fi

# 清理备份
rm -rf "$BACKUP_DIR"

# 确保 .env 中 THEME=berry（更新后自动切换为 berry 主题）
if [ -f "$PROJECT_ROOT/.env" ]; then
    if grep -q "^THEME=" "$PROJECT_ROOT/.env"; then
        sed -i 's/^THEME=.*/THEME=berry/' "$PROJECT_ROOT/.env"
    else
        echo "THEME=berry" >> "$PROJECT_ROOT/.env"
    fi
    print_success "主题已设置为 berry"
fi

# 若存在 .env 则重启容器
if [ -f "$PROJECT_ROOT/.env" ] && command -v docker &> /dev/null; then
    echo ""
    read -p "是否重启 Docker 容器以应用更新? [Y/n] " RESTART
    RESTART=${RESTART:-Y}
    if [[ "$RESTART" =~ ^[Yy]$ ]]; then
        print_step "重启服务容器..."

        # 兼容 docker-compose 和 docker compose plugin
        if command -v docker-compose &> /dev/null; then
            DC="docker-compose"
        elif docker compose version &> /dev/null 2>&1; then
            DC="docker compose"
        else
            print_error "未找到 docker-compose，请手动重启容器"
            exit 1
        fi

        # 判断是否使用外部 MySQL（外部模式不重启 db 容器）
        print_step "重新构建镜像（含最新代码）..."
        $DC build --no-cache one-api
        print_success "镜像构建完成"

        if grep -q '^SQL_DSN=.*@tcp([^d][^b]:' "$PROJECT_ROOT/.env" 2>/dev/null || \
           ! grep -q '^SQL_DSN=.*@tcp(db:' "$PROJECT_ROOT/.env" 2>/dev/null; then
            $DC up -d --force-recreate --no-deps one-api redis 2>/dev/null || $DC up -d --force-recreate
        else
            $DC up -d --force-recreate
        fi

        print_step "等待服务启动..."
        sleep 5
        $DC ps
        print_success "容器已重启"
    fi
fi

echo ""
print_success "更新完成！"
