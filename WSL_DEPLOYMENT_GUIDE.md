# WSL 本地部署指南

## 前置要求

### 1. 安装 WSL2
```powershell
# 在 Windows PowerShell（管理员）中运行
wsl --install
wsl --set-default-version 2
```

### 2. 在 WSL 中安装必要工具

进入WSL后，执行以下命令：

```bash
# 更新包管理器
sudo apt update && sudo apt upgrade -y

# 安装 Docker
sudo apt install -y docker.io docker-compose

# 启动 Docker 服务
sudo service docker start

# 添加当前用户到 docker 组（避免每次都用 sudo）
sudo usermod -aG docker $USER
newgrp docker
```

### 3. 安装 Go（可选，如果不用 Docker）
```bash
# 下载并安装 Go 1.20+
wget https://go.dev/dl/go1.20.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.20.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 验证安装
go version
```

### 4. 安装 Node.js（可选，如果不用 Docker）
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 部署方式

### 方式一：Docker Compose 部署（推荐 ⭐）

**优点**：最简单，一键部署，自动配置数据库和Redis

```bash
# 1. 进入项目目录
cd /path/to/one-api

# 2. 启动服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f one-api

# 5. 停止服务
docker-compose down
```

**访问应用**：
- 打开浏览器访问：`http://localhost:3000`
- MySQL: `localhost:3306`（用户名：`oneapi`，密码：`123456`）

**修改配置**：
编辑 `docker-compose.yml` 中的环境变量：
```yaml
environment:
  - SQL_DSN=oneapi:123456@tcp(db:3306)/one-api
  - SESSION_SECRET=your_random_secret
  - TZ=Asia/Shanghai
```

---

### 方式二：本地编译部署

#### 2.1 编译前端

```bash
# 编译 default 主题
cd web/default
npm install
DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION=$(cat ../../VERSION) npm run build

# 或编译其他主题（berry/air）
cd ../berry
npm install
DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION=$(cat ../../VERSION) npm run build
```

#### 2.2 编译后端

```bash
# 返回项目根目录
cd /path/to/one-api

# 下载依赖
go mod download

# 编译（如使用 SQLite）
go build -o one-api

# 或者（使用 MySQL，需要 GCC）
CGO_ENABLED=1 go build -o one-api
```

#### 2.3 配置数据库

**选择一：使用 SQLite（推荐用于开发，简单）**
```bash
# 默认使用 SQLite，数据库文件在 data 目录
mkdir -p data
./one-api
```

**选择二：使用 MySQL**
```bash
# 先启动 MySQL（使用 Docker）
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=one-api \
  -e MYSQL_USER=oneapi \
  -e MYSQL_PASSWORD=123456 \
  -p 3306:3306 \
  mysql:8.0

# 设置环境变量并启动应用
export SQL_DSN="oneapi:123456@tcp(localhost:3306)/one-api?parseTime=true"
./one-api
```

#### 2.4 Redis（可选，用于分布式缓存）

```bash
# 启动 Redis
docker run -d --name redis -p 6379:6379 redis:latest

# 在应用中配置
export REDIS_CONN_STRING="redis://localhost:6379"
./one-api
```

#### 2.5 运行应用

```bash
# 基础启动
./one-api

# 指定日志目录
./one-api --log-dir ./logs

# 指定端口
./one-api --port 8080

# 后台运行
nohup ./one-api > app.log 2>&1 &
```

访问应用：`http://localhost:3000`

---

## 常见问题

### Q1: Permission denied 错误
```bash
sudo chmod +x one-api
```

### Q2: 无法连接到 Docker
```bash
# 确保 Docker 服务已启动
sudo service docker start

# 或设置开机自启
sudo update-rc.d docker enable
```

### Q3: 端口被占用
```bash
# 查看占用 3000 端口的进程
sudo lsof -i :3000

# 或在启动时指定其他端口
./one-api --port 8080
```

### Q4: MySQL 连接失败
```bash
# 确保 MySQL 已启动
docker ps | grep mysql

# 检查连接字符串格式
# 格式: user:password@tcp(host:port)/database?parseTime=true
```

### Q5: 构建超时或 npm 安装慢
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 清除旧的构建
docker-compose down -v
docker system prune -a
```

---

## 生产部署建议

1. **使用环境变量文件**：
```bash
# 创建 .env 文件
cat > .env << EOF
SQL_DSN=oneapi:password@tcp(db:3306)/one-api
REDIS_CONN_STRING=redis://redis:6379
SESSION_SECRET=your_secure_random_string_here
EOF

docker-compose up -d
```

2. **配置反向代理（Nginx）**：
```nginx
server {
    listen 80;
    server_name your.domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **定期备份数据**：
```bash
# 备份 MySQL
docker exec mysql mysqldump -u oneapi -p123456 one-api > backup.sql

# 或备份 SQLite
cp -r data/oneapi data-backup-$(date +%Y%m%d)
```

---

## 查看日志和调试

```bash
# Docker 方式
docker-compose logs -f one-api
docker-compose logs -f mysql
docker-compose logs -f redis

# 本地部署
tail -f logs/app.log
tail -f logs/error.log
```

---

完成部署后，访问 `http://localhost:3000` 即可使用应用！
