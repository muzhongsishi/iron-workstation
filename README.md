---
title: Iron Workstation
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# 钢铁工作站预约系统 (Iron Workstation System)

本系统旨在解决实验室工作站“占位冲突”和“闲置未知”的问题。核心逻辑是**基于预约时间表**来管理机器状态。

## 功能特性
- **资源看板**: 直观展示所有工作站的忙碌/空闲状态（红色=忙碌，绿色=空闲）。
- **预约管理**: 支持按天预约，自动检测冲突。
- **自动化提醒**: 
    - 每日检查“僵尸任务”（超过24小时未续活）。
    - 每日早晨提醒“即将到期”的用户。
- **白名单认证**: 仅限名单内人员使用，首次登录设置 PIN 码。

## 快速开始

### 1. 环境准备
确保已安装：
- Python 3.9+
- Node.js 18+
- SQLite (内置)

### 2. 初始化配置
首次运行前，请确保根目录下有以下文件（已包含）：
- `名单.xlsx`: 用户白名单。
- `Hardwareinfo.md` (或 `硬件信息.md`): 机器配置列表。

配置 `.env` 文件（用于邮件通知）：
```bash
cp .env.example .env
# 编辑 .env 填入 QQ 邮箱 SMTP 信息
```

### 3.初始化数据库
```bash
# 进入虚拟环境
source venv/bin/activate
# 运行种子脚本
python backend/scripts/seeds.py
```

### 4. 启动系统
使用提供的脚本一键启动后端 (8000) 和前端 (5173)：
```bash
./start_dev.sh
```

## 维护指南
- **数据备份**: 定期备份 `backend/database.db`。
- **用户更新**: 修改 `名单.xlsx` 后重新运行 `seeds.py` (注意：现有用户不会被删除，仅新增)。
- **添加机器**: 修改 `硬件信息.md` 后重新运行 `seeds.py`。

## 技术栈
- **Backend**: Python FastAPI, SQLModel (SQLite), APScheduler.
- **Frontend**: React, Vite, Tailwind CSS v4, Glassmorphism UI.
