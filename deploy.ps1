# One-API 一键部署脚本 (PowerShell 版本)
# 在 Windows 中运行此脚本

param(
    [ValidateSet('docker', 'local')]
    [string]$DeployMethod = 'docker'
)

# 颜色输出
function Write-Success { Write-Host "[✓] $args" -ForegroundColor Green }
function Write-Step    { Write-Host "[→] $args" -ForegroundColor Cyan }
function Write-Warn    { Write-Host "[!] $args" -ForegroundColor Yellow }
function Write-Err     { Write-Host "[✗] $args" -ForegroundColor Red }

Write-Host "=========================================" -ForegroundColor Blue
Write-Host "One-API 一键部署脚本" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# 获取项目根目录
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = $ProjectRoot -replace '\\', '/'
$WslProjectPath = "/mnt/$(([char]$ProjectPath[0]).ToString().ToLower())$($ProjectPath.Substring(1) -replace ':', '' -replace '\\', '/')"

Write-Step "项目位置: $ProjectRoot"

# 检查 WSL
Write-Step "检查 WSL 是否已安装..."
try {
    $null = wsl --version 2>&1
    Write-Success "WSL 已安装"
} catch {
    Write-Err "WSL 未安装，请先运行: wsl --install"
    exit 1
}

# ===== MySQL 配置收集 =====
function Get-MySQLConfig {
    param([string]$Mode)

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "MySQL 数据库配置" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""

    $mysqlType = "2"  # 默认外部

    if ($Mode -eq "docker") {
        Write-Host "请选择 MySQL 部署方式:"
        Write-Host "  1) 使用内置 MySQL 容器（自动部署，推荐）"
        Write-Host "  2) 连接外部 MySQL 服务器"
        Write-Host ""
        $mysqlType = Read-Host "请输入选项 [1/2] (默认: 1)"
        if ([string]::IsNullOrWhiteSpace($mysqlType)) { $mysqlType = "1" }
    }

    $config = @{}

    if ($mysqlType -eq "1") {
        $config.Mode = "internal"
        Write-Host ""
        Write-Host "--- 配置内置 MySQL 容器 ---" -ForegroundColor Cyan

        $rootPwd = Read-Host "MySQL root 密码 (回车使用默认 'OneAPI@2024')"
        if ([string]::IsNullOrWhiteSpace($rootPwd)) { $rootPwd = "OneAPI@2024" }
        $config.RootPassword = $rootPwd

        $user = Read-Host "应用数据库用户名 (默认: oneapi)"
        if ([string]::IsNullOrWhiteSpace($user)) { $user = "oneapi" }
        $config.User = $user

        do {
            $pwd = Read-Host "应用数据库密码" -AsSecureString
            $plainPwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd))
            if ([string]::IsNullOrWhiteSpace($plainPwd)) { Write-Warn "密码不能为空，请重新输入" }
        } while ([string]::IsNullOrWhiteSpace($plainPwd))
        $config.Password = $plainPwd

        $db = Read-Host "数据库名称 (默认: one-api)"
        if ([string]::IsNullOrWhiteSpace($db)) { $db = "one-api" }
        $config.Database = $db

        $config.Host = "db"
        $config.Port = "3306"
        $config.SqlDsn = "$($config.User):$($config.Password)@tcp(db:3306)/$($config.Database)"

    } else {
        $config.Mode = "external"
        $config.RootPassword = ""
        Write-Host ""
        Write-Host "--- 连接外部 MySQL 服务器 ---" -ForegroundColor Cyan

        do {
            $host_ = Read-Host "MySQL 服务器地址"
            if ([string]::IsNullOrWhiteSpace($host_)) { Write-Warn "地址不能为空，请重新输入" }
        } while ([string]::IsNullOrWhiteSpace($host_))
        $config.Host = $host_

        $port = Read-Host "MySQL 端口 (默认: 3306)"
        if ([string]::IsNullOrWhiteSpace($port)) { $port = "3306" }
        $config.Port = $port

        do {
            $user = Read-Host "数据库用户名"
            if ([string]::IsNullOrWhiteSpace($user)) { Write-Warn "用户名不能为空，请重新输入" }
        } while ([string]::IsNullOrWhiteSpace($user))
        $config.User = $user

        do {
            $pwd = Read-Host "数据库密码" -AsSecureString
            $plainPwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd))
            if ([string]::IsNullOrWhiteSpace($plainPwd)) { Write-Warn "密码不能为空，请重新输入" }
        } while ([string]::IsNullOrWhiteSpace($plainPwd))
        $config.Password = $plainPwd

        $db = Read-Host "数据库名称 (默认: one-api)"
        if ([string]::IsNullOrWhiteSpace($db)) { $db = "one-api" }
        $config.Database = $db

        $config.SqlDsn = "$($config.User):$($config.Password)@tcp($($config.Host):$($config.Port))/$($config.Database)"
    }

    Write-Host ""
    Write-Success "MySQL 配置完成"
    if ($config.Mode -eq "internal") {
        Write-Host "  模式: 内置容器 (db:3306)"
    } else {
        Write-Host "  地址: $($config.Host):$($config.Port)"
    }
    Write-Host "  数据库: $($config.Database)"
    Write-Host "  用户名: $($config.User)"
    Write-Host ""

    return $config
}

# ===== Docker 部署模式 =====
if ($DeployMethod -eq 'docker') {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "Docker Compose 部署模式" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""

    $mysql = Get-MySQLConfig -Mode "docker"

    Write-Step "安装必要工具..."
    wsl bash -c @"
        sudo apt update > /dev/null 2>&1
        if ! command -v docker &> /dev/null; then
            echo '安装 Docker...'
            sudo apt install -y docker.io > /dev/null 2>&1
            sudo service docker start > /dev/null 2>&1
            sudo usermod -aG docker `$USER
        fi
        if ! command -v docker-compose &> /dev/null; then
            echo '安装 docker-compose...'
            sudo apt install -y docker-compose > /dev/null 2>&1
        fi
"@

    Write-Step "启动 Docker 服务..."
    wsl bash -c "sudo service docker start && echo 'Docker 已启动'"

    # 生成随机 SESSION_SECRET 并写入 .env
    Write-Step "生成配置文件..."
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

    $envContent = @"
MYSQL_ROOT_PASSWORD=$($mysql.RootPassword)
MYSQL_USER=$($mysql.User)
MYSQL_PASSWORD=$($mysql.Password)
MYSQL_DATABASE=$($mysql.Database)
SQL_DSN=$($mysql.SqlDsn)
SESSION_SECRET=$sessionSecret
"@
    $envFile = Join-Path $ProjectRoot ".env"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Success ".env 配置文件已生成"

    Write-Step "启动容器..."
    if ($mysql.Mode -eq "external") {
        wsl bash -c "cd $WslProjectPath && docker-compose down 2>/dev/null; docker-compose pull one-api redis && docker-compose up -d --no-deps one-api redis"
    } else {
        wsl bash -c "cd $WslProjectPath && docker-compose down -v 2>/dev/null; docker-compose pull && docker-compose up -d"
    }

    Write-Step "等待服务启动..."
    Start-Sleep -Seconds 10

    Write-Step "检查服务状态..."
    wsl bash -c "cd $WslProjectPath && docker-compose ps"

    Write-Success "Docker Compose 部署完成！"
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "服务信息:" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "应用地址: http://localhost:3000" -ForegroundColor Cyan
    if ($mysql.Mode -eq "internal") {
        Write-Host "MySQL 地址: localhost:3306"
        Write-Host "  用户名: $($mysql.User)"
    } else {
        Write-Host "MySQL 地址: $($mysql.Host):$($mysql.Port)/$($mysql.Database)"
    }
    Write-Host ""
    Write-Host "常用命令:" -ForegroundColor Cyan
    Write-Host "  查看日志: wsl bash -c 'cd $WslProjectPath && docker-compose logs -f one-api'"
    Write-Host "  停止服务: wsl bash -c 'cd $WslProjectPath && docker-compose down'"
    Write-Host "=========================================" -ForegroundColor Blue

# ===== 本地编译部署模式 =====
} elseif ($DeployMethod -eq 'local') {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "本地编译部署模式" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""

    $mysql = Get-MySQLConfig -Mode "local"

    Write-Step "安装 Go 和 Node.js..."
    wsl bash -c @"
        set -e
        if [[ ! -f /checked-packages ]]; then
            sudo apt update > /dev/null 2>&1
            sudo apt install -y build-essential > /dev/null 2>&1
            touch /checked-packages
        fi
        if ! command -v go &> /dev/null; then
            echo '安装 Go...'
            curl -L https://go.dev/dl/go1.20.linux-amd64.tar.gz -o /tmp/go.tar.gz 2>/dev/null
            sudo rm -rf /usr/local/go
            sudo tar -C /usr/local -xzf /tmp/go.tar.gz > /dev/null 2>&1
        fi
        if ! command -v node &> /dev/null; then
            echo '安装 Node.js...'
            curl -fsSL https://deb.nodesource.com/setup_16.x 2>/dev/null | sudo -E bash - > /dev/null 2>&1
            sudo apt install -y nodejs > /dev/null 2>&1
        fi
        export PATH=`$PATH:/usr/local/go/bin
        go version 2>/dev/null || echo 'Go 已配置'
        node --version 2>/dev/null || echo 'Node.js 已配置'
"@

    Write-Step "编译前端..."
    wsl bash -c @"
        cd $WslProjectPath/web/default
        npm install > /dev/null 2>&1
        DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION=`$(cat ../../VERSION) npm run build > /dev/null 2>&1
        echo '前端编译完成'
"@

    Write-Step "编译后端..."
    wsl bash -c @"
        set -e
        cd $WslProjectPath
        export PATH=`$PATH:/usr/local/go/bin
        go mod download > /dev/null 2>&1
        CGO_ENABLED=1 go build -o one-api
        echo '后端编译完成'
"@

    Write-Success "编译完成！"
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "应用信息:" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "应用地址: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "MySQL: $($mysql.Host):$($mysql.Port)/$($mysql.Database)"
    Write-Host ""
    Write-Host "启动应用命令:" -ForegroundColor Cyan
    Write-Host "  wsl bash -c 'cd $WslProjectPath && SQL_DSN=""$($mysql.SqlDsn)"" ./one-api --log-dir ./logs'"
    Write-Host ""
    Write-Host "后台运行:" -ForegroundColor Cyan
    Write-Host "  wsl bash -c 'cd $WslProjectPath && export SQL_DSN=""$($mysql.SqlDsn)"" && nohup ./one-api > app.log 2>&1 &'"
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Warn "请在 WSL 终端中手动运行应用"

} else {
    Write-Err "无效的部署方法: $DeployMethod"
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File deploy.ps1 [-DeployMethod docker|local]"
    exit 1
}

Write-Host ""
Write-Success "部署脚本执行完成！"
