# 快速部署指南

## 最快的方式（推荐） ⚡

### Windows PowerShell（管理员运行）

```powershell
# Docker 部署（最简单，3分钟完成）
powershell -ExecutionPolicy Bypass -File deploy.ps1 -DeployMethod docker

# 本地部署（需要编译，10-15分钟）
powershell -ExecutionPolicy Bypass -File deploy.ps1 -DeployMethod local
```

### WSL 终端

```bash
# Docker 部署
bash deploy.sh docker

# 本地部署
bash deploy.sh local
```

---

## Docker 快速命令

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f one-api

# 停止服务
docker-compose down

# 清理所有数据后重新启动
docker-compose down -v
docker-compose up -d

# 进入容器
docker exec -it one-api sh

# 重启单个服务
docker-compose restart one-api
```

---

## 本地编译快速命令

```bash
# 1. 编译前端
cd web/default
npm install
npm run build
cd ../..

# 2. 编译后端
go mod download
go build -o one-api

# 3. 启动应用
./one-api

# 或后台运行
nohup ./one-api > app.log 2>&1 &
```

---

## 访问应用

- **应用首页**: http://localhost:3000
- **默认账户**: admin / 需要在首次访问时设置
- **API文档**: http://localhost:3000/docs (如果启用)

---

## 环境信息

### Docker 方式
- **One-API**: http://localhost:3000
- **MySQL**: localhost:3306
  - 用户名：`oneapi`
  - 密码：`123456`
  - 数据库：`one-api`
- **Redis**: localhost:6379

### 本地编译方式
- **数据库**: SQLite (data 目录)
- **日志**: logs 目录
- **端口**: 3000

---

## 常见问题快速解决

| 问题 | 解决方案 |
|------|--------|
| Docker 找不到 | `sudo service docker start` |
| 端口被占用 | `sudo lsof -i :3000` 查看，或改端口 |
| 权限不足 | `sudo chmod +x one-api` |
| npm install 慢 | 使用镜像：`npm config set registry https://registry.npmmirror.com` |
| MySQL 连接失败 | 检查 `SQL_DSN` 环境变量 |
| 前端编译失败 | 清除缓存：`rm -rf node_modules package-lock.json` |

---

## 数据持久化

### Docker 方式
数据自动保存在:
- MySQL: `./data/mysql/`
- One-API: `./data/oneapi/`

### 本地编译方式
数据保存在:
- SQLite: `./data/`
- 日志: `./logs/`

---

## 多个前端主题

One-API 支持多个主题，可在配置中切换:

```bash
# 编译不同主题
cd web/default   # 默认主题
cd web/berry     # Berry 主题
cd web/air       # Air 主题

npm install
npm run build
```

在应用设置中切换主题即可。

---

## 性能优化建议

1. **增加 MySQL 缓存**:
```env
SQL_DSN=oneapi:123456@tcp(db:3306)/one-api?parseTime=true&maxOpenConns=25
```

2. **开启 Redis 缓存**:
```env
REDIS_CONN_STRING=redis://redis:6379/0
```

3. **启用 Gzip 压缩** (已默认启用)

4. **使用 CDN** 加速前端静态资源

---

## 监控和日志

```bash
# 查看实时日志
docker-compose logs -f

# 只看特定服务
docker-compose logs -f one-api
docker-compose logs -f mysql
docker-compose logs -f redis

# 查看历史日志量
docker-compose logs --tail=100 one-api

# 清空日志
docker-compose logs -f --rm one-api
```

---

## 备份和恢复

```bash
# 备份 MySQL 数据库
docker exec mysql mysqldump -u root -p123456 one-api > backup.sql

# 本地备份
cp -r data/mysql data/mysql.backup-$(date +%Y%m%d)

# 恢复数据库
docker exec -i mysql mysql -u root -p123456 one-api < backup.sql

# 备份 SQLite
cp data/one-api.db data/one-api.db.backup
```

---

## 生产部署

使用环境变量文件:

```bash
cat > .env << EOF
SQL_DSN=user:password@tcp(db:3306)/one-api
SESSION_SECRET=$(openssl rand -hex 32)
REDIS_CONN_STRING=redis://redis:6379
EOF

docker-compose --env-file .env up -d
```

---

## 升级应用

```bash
# 更新镜像
docker-compose pull

# 重启服务（自动应用新版本）
docker-compose up -d

# 检查版本
docker exec one-api ./one-api --version
```

---

更多详情查看: [WSL_DEPLOYMENT_GUIDE.md](WSL_DEPLOYMENT_GUIDE.md)
