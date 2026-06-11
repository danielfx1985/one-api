#!/bin/bash

# One-API 一键部署脚本
# 使用: bash deploy.sh [docker|local]

set -e

DEPLOY_METHOD=${1:-docker}

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step()    { echo -e "${BLUE}[步骤]${NC} $1"; }
print_success() { echo -e "${GREEN}[成功]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[注意]${NC} $1"; }
print_error()   { echo -e "${RED}[错误]${NC} $1"; }

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "========================================="
echo "One-API 一键部署脚本"
echo "========================================="
echo ""

# 收集 MySQL 配置
collect_mysql_config() {
    echo ""
    echo "========================================="
    echo "MySQL 数据库配置"
    echo "========================================="
    echo ""

    if [ "$DEPLOY_METHOD" = "docker" ]; then
        echo "请选择 MySQL 部署方式:"
        echo "  1) 使用内置 MySQL 容器（自动部署，推荐）"
        echo "  2) 连接外部 MySQL 服务器"
        echo ""
        read -p "请输入选项 [1/2] (默认: 1): " MYSQL_TYPE
        MYSQL_TYPE=${MYSQL_TYPE:-1}
    else
        # 本地模式只支持外部 MySQL
        MYSQL_TYPE=2
    fi

    if [ "$MYSQL_TYPE" = "1" ]; then
        MYSQL_MODE="internal"
        echo ""
        echo "--- 配置内置 MySQL 容器 ---"

        read -p "MySQL root 密码 (回车使用默认 'OneAPI@2024'): " MYSQL_ROOT_PASSWORD
        MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-"OneAPI@2024"}

        read -p "应用数据库用户名 (默认: oneapi): " MYSQL_USER
        MYSQL_USER=${MYSQL_USER:-oneapi}

        while true; do
            read -sp "应用数据库密码: " MYSQL_PASSWORD
            echo ""
            [ -n "$MYSQL_PASSWORD" ] && break
            print_warning "密码不能为空，请重新输入"
        done

        read -p "数据库名称 (默认: one-api): " MYSQL_DATABASE
        MYSQL_DATABASE=${MYSQL_DATABASE:-one-api}

        # 内置容器：one-api 通过 docker 内网访问 db:3306
        MYSQL_HOST="db"
        MYSQL_PORT="3306"
        SQL_DSN="${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(db:3306)/${MYSQL_DATABASE}"

    else
        MYSQL_MODE="external"
        MYSQL_ROOT_PASSWORD=""
        echo ""
        echo "--- 连接外部 MySQL 服务器 ---"

        while true; do
            read -p "MySQL 服务器地址: " MYSQL_HOST
            [ -n "$MYSQL_HOST" ] && break
            print_warning "地址不能为空，请重新输入"
        done

        read -p "MySQL 端口 (默认: 3306): " MYSQL_PORT
        MYSQL_PORT=${MYSQL_PORT:-3306}

        while true; do
            read -p "数据库用户名: " MYSQL_USER
            [ -n "$MYSQL_USER" ] && break
            print_warning "用户名不能为空，请重新输入"
        done

        while true; do
            read -sp "数据库密码: " MYSQL_PASSWORD
            echo ""
            [ -n "$MYSQL_PASSWORD" ] && break
            print_warning "密码不能为空，请重新输入"
        done

        read -p "数据库名称 (默认: one-api): " MYSQL_DATABASE
        MYSQL_DATABASE=${MYSQL_DATABASE:-one-api}

        SQL_DSN="${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(${MYSQL_HOST}:${MYSQL_PORT})/${MYSQL_DATABASE}"
    fi

    echo ""
    print_success "MySQL 配置完成"
    if [ "$MYSQL_MODE" = "internal" ]; then
        echo "  模式: 内置容器 (db:3306)"
    else
        echo "  地址: ${MYSQL_HOST}:${MYSQL_PORT}"
    fi
    echo "  数据库: ${MYSQL_DATABASE}"
    echo "  用户名: ${MYSQL_USER}"
    echo ""
}

print_step "检查系统环境..."

if ! grep -qi microsoft /proc/version 2>/dev/null; then
    print_warning "未检测到 WSL，某些功能可能不可用"
fi

if [ "$DEPLOY_METHOD" = "docker" ]; then

    echo ""
    echo "========================================="
    echo "Docker Compose 部署模式"
    echo "========================================="
    echo ""

    collect_mysql_config

    # 安装 Docker（按发行版选择方法）
    install_docker() {
        local ID=""
        [ -f /etc/os-release ] && . /etc/os-release
        case "$ID" in
            ubuntu|debian|linuxmint)
                sudo apt-get update -y
                sudo apt-get install -y ca-certificates curl gnupg
                sudo install -m 0755 -d /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/${ID}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} $(lsb_release -cs) stable" \
                    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                sudo apt-get update -y
                sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                ;;
            centos|rhel|fedora|alinux|alios|anolis|rocky|almalinux|ol)
                sudo yum install -y yum-utils
                sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
                sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
                ;;
            *)
                print_warning "未知发行版 '$ID'，尝试通用安装脚本..."
                curl -fsSL https://get.docker.com | sudo sh
                ;;
        esac
    }

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker 未安装，开始安装..."
        install_docker
        sudo usermod -aG docker $USER
        print_success "Docker 已安装，请重新登录生效"
    else
        print_success "Docker 已安装"
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        print_warning "docker-compose 未安装，开始安装..."
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "docker-compose 已安装"
    else
        # 若只有插件形式 (docker compose)，创建兼容 shim
        if ! command -v docker-compose &> /dev/null; then
            sudo tee /usr/local/bin/docker-compose > /dev/null << 'SHIM'
#!/bin/sh
exec docker compose "$@"
SHIM
            sudo chmod +x /usr/local/bin/docker-compose
            print_success "docker-compose shim 已创建 (-> docker compose plugin)"
        else
            print_success "docker-compose 已安装"
        fi
    fi

    # 使用 systemctl 优先，回退到 service
    print_step "启动 Docker 服务..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl enable docker 2>/dev/null || true
        sudo systemctl start docker || true
    else
        sudo service docker start || true
    fi

    if [ ! -f "docker-compose.yml" ]; then
        print_error "未找到 docker-compose.yml 文件"
        exit 1
    fi

    # 生成随机 SESSION_SECRET
    SESSION_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1 2>/dev/null || echo "change_me_$(date +%s)")

    # 写入 .env 文件供 docker-compose 读取
    print_step "生成配置文件..."
    cat > .env << EOF
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
SQL_DSN=${SQL_DSN}
SESSION_SECRET=${SESSION_SECRET}
EOF
    print_success ".env 配置文件已生成"

    print_step "启动服务容器..."
    if [ "$MYSQL_MODE" = "external" ]; then
        # 外部 MySQL：仅启动 one-api 和 redis，跳过内置 db 容器
        docker-compose down || true
        docker-compose pull one-api redis
        docker-compose up -d --no-deps one-api redis
    else
        # 内置 MySQL：启动全部服务
        docker-compose down -v || true
        docker-compose pull
        docker-compose up -d
    fi

    print_step "等待服务启动..."
    sleep 10

    if docker-compose ps | grep -q "one-api"; then
        print_success "Docker Compose 部署完成！"
        echo ""
        echo "========================================="
        echo "服务信息："
        echo "========================================="
        docker-compose ps
        echo ""
        echo "应用地址: ${BLUE}http://localhost:3000${NC}"
        if [ "$MYSQL_MODE" = "internal" ]; then
            echo "MySQL 地址: localhost:3306"
            echo "  用户名: ${MYSQL_USER}"
        else
            echo "MySQL 地址: ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}"
        fi
        echo ""
        echo "查看日志: docker-compose logs -f one-api"
        echo "停止服务: docker-compose down"
        echo "========================================="
    else
        print_warning "服务启动可能失败，请检查日志："
        docker-compose logs one-api
        exit 1
    fi

elif [ "$DEPLOY_METHOD" = "local" ]; then

    echo ""
    echo "========================================="
    echo "本地编译部署模式"
    echo "========================================="
    echo ""

    collect_mysql_config

    # 检查 Go
    if ! command -v go &> /dev/null; then
        print_warning "Go 未安装，开始安装..."
        curl -L https://go.dev/dl/go1.20.linux-amd64.tar.gz -o /tmp/go.tar.gz
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        export PATH=$PATH:/usr/local/go/bin
        print_success "Go 已安装"
    else
        print_success "Go 已安装: $(go version)"
    fi

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js 未安装，开始安装..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 18 && nvm use 18
        print_success "Node.js 已安装"
    else
        print_success "Node.js 已安装: $(node --version)"
    fi

    # 编译前端
    print_step "编译前端项目..."
    cd "$PROJECT_ROOT/web/default"
    npm install
    DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION=$(cat ../../VERSION) npm run build
    print_success "前端编译完成"

    # 编译后端
    print_step "编译后端项目..."
    cd "$PROJECT_ROOT"
    go mod download
    CGO_ENABLED=1 go build -o one-api
    print_success "后端编译完成"

    mkdir -p data logs

    # 启动应用（注入 SQL_DSN）
    print_step "启动应用..."
    export SQL_DSN="${SQL_DSN}"
    ./one-api --log-dir ./logs &
    APP_PID=$!

    sleep 3

    if kill -0 $APP_PID 2>/dev/null; then
        print_success "本地部署完成！"
        echo ""
        echo "========================================="
        echo "应用信息："
        echo "========================================="
        echo "应用 PID: $APP_PID"
        echo "应用地址: ${BLUE}http://localhost:3000${NC}"
        echo "MySQL: ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}"
        echo ""
        echo "查看日志: tail -f logs/app.log"
        echo "停止应用: kill $APP_PID"
        echo "========================================="
    else
        print_warning "应用启动失败，请检查日志"
        exit 1
    fi

else
    echo "使用方法: $0 [docker|local]"
    echo ""
    echo "示例:"
    echo "  $0 docker    # 使用 Docker Compose 部署（推荐）"
    echo "  $0 local     # 本地编译部署"
    exit 1
fi

print_success "部署完成！"
