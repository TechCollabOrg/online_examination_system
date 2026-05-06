# 在线考试系统

> 一个支持学生答题、教师出卷阅卷、管理员统筹的全功能在线考试平台。
> 学生端可打包为 Windows `.exe`，在没有浏览器的机房也能运行。

---

## 目录

- [这个系统能做什么？](#这个系统能做什么)
- [三种角色功能一览](#三种角色功能一览)
- [快速体验（第一次运行）](#快速体验第一次运行)
- [环境准备详解](#环境准备详解)
- [启动项目（开发模式）](#启动项目开发模式)
- [打包为学生端 .exe](#打包为学生端-exe)
- [常见启动问题排查](#常见启动问题排查)
- [开发者参考](#开发者参考)
- [待完善功能与已知差距](#待完善功能与已知差距)
- [安全注意事项](#安全注意事项)

---

## 这个系统能做什么？

这是一套**在线考试平台**，主要用于学校或培训机构：

- **学生**：在网页或桌面程序里参加考试、平时刷题、查看成绩和错题
- **教师**：创建题库、出卷、发布考试、批阅主观题、查看班级统计
- **管理员**：管理用户账号、班级分组、系统公告、操作日志

系统支持**单选题、多选题、判断题、简答题**四种题型，客观题自动批改，主观题由教师人工打分。

---

## 三种角色功能一览

### 学生能做什么

| 功能 | 说明 |
|------|------|
| 试卷中心 | 查看自己班级发布的所有考试，点击参加 |
| 参加考试 | 在线答题，全屏模式防止切屏作弊，切屏次数会被记录 |
| 刷题中心 | 练习题库中的题目，随时可做不计入成绩 |
| 考试记录 | 查看历次考试的分数和答题详情 |
| 刷题记录 | 查看自己的刷题历史 |
| 错题本 | 自动收集做错的题目，可重新练习 |
| 讨论区 | 与同学和老师讨论题目疑问 |
| 个人中心 | 修改头像、昵称、密码 |
| 我的证书 | 查看通过考试获得的电子证书 |

### 教师能做什么

| 功能 | 说明 |
|------|------|
| 题库管理 | 新建、编辑、删除题目，支持四种题型 |
| 题目分类 | 给题目打标签分类，方便组卷 |
| 试题仓库 | 管理题目集合，按类别组织 |
| 考试管理 | 创建考试（设置时间、题目、分数、通过分线） |
| 阅卷评分 | 批改学生的简答题，给出分数和批注 |
| 班级管理 | 查看班级学生名单，分配考试 |
| 成绩统计 | 查看班级整体成绩分布和分析 |
| 讨论管理 | 管理学生的讨论帖，回复问题 |
| 公告通知 | 发布班级通知 |

### 管理员能做什么

| 功能 | 说明 |
|------|------|
| 用户管理 | 创建/停用账号，分配学生或教师角色 |
| 班级管理 | 创建班级，批量导入学生 |
| 日志查看 | 查看所有操作记录 |
| 考试管理 | 对所有考试有完整管理权限 |
| 统计报表 | 全站数据概览 |
| 证书管理 | 配置和颁发电子证书 |

---

## 快速体验（第一次运行）

如果你只是想快速看到系统跑起来，按下面的步骤操作：

### 第一步：安装必要软件

在你的电脑上依次安装：

1. **JDK 8**（Java 运行环境）：[下载地址](https://www.oracle.com/java/technologies/downloads/#java8)
2. **Maven**（Java 构建工具）：[下载地址](https://maven.apache.org/download.cgi) — 解压后把 `bin` 目录加入系统 PATH
3. **MySQL**（数据库）：[下载地址](https://dev.mysql.com/downloads/mysql/)，安装时设置 root 密码为 `root`
4. **Redis**（缓存）：Windows 推荐安装 [Memurai](https://www.memurai.com/)（免费版完全够用）
5. **Node.js 16 LTS**（前端运行环境）：[下载地址](https://nodejs.org/en/download/releases)

### 第二步：初始化数据库

打开 MySQL，创建数据库并导入初始数据：

```sql
CREATE DATABASE db_exam DEFAULT CHARACTER SET utf8mb4;
```

然后在 MySQL 客户端（如 Navicat 或命令行）中运行 `online-exam-system-backend/lib/` 目录下的 SQL 文件。

### 第三步：启动后端

```bash
cd online-exam-system-backend
mvn spring-boot:run
```

启动成功后，后端运行在 `http://127.0.0.1:8080`。

### 第四步：启动前端

新开一个终端窗口：

```bash
cd online-exam-system-frontend
npm install
npm run dev
```

启动成功后，浏览器打开 `http://localhost:9527`，即可看到登录页面。

> **默认测试账号**（由数据库初始脚本创建）：
>
> | 角色 | 用户名 | 密码 |
> |------|--------|------|
> | 管理员 | `admin` | `123456` |
> | 教师 | `teacher` | `123456` |
> | 学生 | `student` | `123456` |
>
> 正式上线前请及时修改以上密码。

---

## 环境准备详解

### 所需软件版本

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| JDK | 8 或 11 | 后端以 Java 8 为目标编译，JDK 11 也兼容 |
| Maven | 3.x | 后端构建工具 |
| MySQL | 5.7+ | 数据库，库名 `db_exam` |
| Redis | 任意稳定版 | 缓存与会话，Windows 推荐 Memurai |
| Node.js | 16 LTS | 前端开发环境；**不推荐 18+**，可能有依赖兼容问题 |
| MinIO | 可选 | 文件（图片、附件）存储，不配置则禁用文件上传 |

### 默认连接配置（`application-dev.yml`）

| 服务 | 地址 | 账号 | 密码 |
|------|------|------|------|
| MySQL | `127.0.0.1:3306` | `root` | `root` |
| Redis | `127.0.0.1:6379` | — | 无密码 |
| 后端 API | `http://127.0.0.1:8080` | — | — |
| 前端页面 | `http://localhost:9527` | — | — |
| Knife4j 接口文档 | `http://127.0.0.1:8080/doc.html` | — | — |

如需修改数据库密码等，在系统环境变量中设置对应变量名（变量名见 `online-exam-system-backend/env.example`）即可覆盖默认值，**无需修改代码**。

---

## 启动项目（开发模式）

### 启动后端

```bash
cd online-exam-system-backend
mvn spring-boot:run
```

- 默认端口 **8080**，接口前缀 `/api`
- 接口文档（Swagger/Knife4j）：`http://127.0.0.1:8080/doc.html`

### 启动前端（浏览器访问）

```bash
cd online-exam-system-frontend
npm install      # 首次运行需要，之后可跳过
npm run dev
```

- 默认端口 **9527**
- `/api` 请求自动代理到后端 `8080`，无需手动配置跨域

### 启动学生端（Electron 桌面调试，可选）

```bash
cd online-exam-system-frontend
npm run electron:dev
```

开启全屏 kiosk 模式（模拟机房环境）：

```bash
npx cross-env EXAM_KIOSK=1 npm run electron:dev
```

---

## 打包为学生端 .exe

用于在机房等无浏览器环境给学生使用，打包后得到一个可直接运行的 Windows 程序。

### 第一步：配置打包环境变量

```bash
cd online-exam-system-frontend
copy .env.electron.example .env.electron   # Windows
# macOS/Linux: cp .env.electron.example .env.electron
```

编辑 `.env.electron`，将以下字段改为你的实际地址：

```env
VUE_APP_BASE_API=http://你的服务器IP:8080/api     # 后端 API 地址
VUE_APP_WS_URL=ws://你的服务器IP:8080/websocket   # WebSocket 地址
VUE_APP_CRYPTO_KEY=你的16字符密钥                  # 需与后端 EXAM_AES_KEY 一致
VUE_APP_CRYPTO_IV=你的16字符向量                   # 需与后端 EXAM_AES_IV 一致
```

> **重要**：加密密钥（CRYPTO_KEY/IV）必须与后端环境变量 `EXAM_AES_KEY`/`EXAM_AES_IV` **完全一致**，否则登录时加解密会失败。

### 第二步：执行打包

```bash
npm run electron:dist
```

打包完成后，产物在 `online-exam-system-frontend/release/` 目录：

| 文件类型 | 适用场景 |
|---------|---------|
| `*-portable.exe` | 绿色版，直接复制到学生机运行，无需安装 |
| `*-setup.exe` | 安装包，有安装向导和桌面快捷方式 |

> **注意**：`.exe` 不包含 Java 后端。后端需要在另一台服务器（或局域网机器）上单独运行，学生机通过网络连接。

---

## 常见启动问题排查

### 问题 1：终端提示找不到 `mvn`

Maven 未安装或未加入 PATH。安装 Maven 后，打开新终端验证：

```bash
mvn -version
```

能看到版本号说明配置正确。

### 问题 2：`java -version` 闪退或输出异常

电脑上可能存在多个 Java 版本互相冲突。解决方法：

1. 安装 **JDK 8 或 JDK 11**
2. 设置系统环境变量 `JAVA_HOME` 指向该 JDK 目录
3. 将 `%JAVA_HOME%\bin` 移到 PATH **最前面**
4. 重新打开终端，验证 `java -version`

### 问题 3：Maven 下载依赖时报 SSL 错误

通常是网络问题或 Maven 连接到了错误的 Java。配置阿里云镜像可解决：

编辑（或新建）`C:\Users\你的用户名\.m2\settings.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
  <mirrors>
    <mirror>
      <id>aliyun-public</id>
      <mirrorOf>*</mirrorOf>
      <name>Aliyun Maven Mirror</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

配置后重新运行 `mvn -U spring-boot:run`。

### 问题 4：后端启动后前端显示"连接失败"

检查以下几点：

- MySQL 和 Redis 是否已启动（在任务管理器或服务列表中确认）
- 数据库 `db_exam` 是否已创建并导入初始 SQL
- 后端控制台是否有红色报错信息（按报错内容排查）

### 问题 5：Node.js 版本导致前端依赖安装失败

如果你的 Node.js 是 18 或更高版本，建议使用 `nvm-windows` 切换到 **Node 16 LTS**：

```bash
nvm install 16
nvm use 16
npm install
npm run dev
```

---

## 开发者参考

### 项目结构

```
online_examination_system/
├── online-exam-system-backend/     # Spring Boot 后端
│   ├── src/main/java/.../
│   │   ├── config/                 # 安全、跨域、Redis、Swagger 配置
│   │   ├── controller/             # REST API 控制器
│   │   ├── service/impl/           # 业务逻辑实现
│   │   ├── mapper/                 # MyBatis-Plus 数据访问层
│   │   ├── model/                  # 实体类、VO、Form、DTO
│   │   ├── filter/                 # JWT Token 验证过滤器
│   │   └── websocket/              # WebSocket 监考推送
│   ├── src/main/resources/
│   │   ├── application.yml         # 主配置（指定激活 dev/prod）
│   │   ├── application-dev.yml     # 开发环境配置（含数据库连接）
│   │   └── application-prod.yml    # 生产环境配置（用环境变量占位）
│   └── lib/                        # 数据库初始化 SQL 脚本
│
└── online-exam-system-frontend/    # Vue 2 前端
    ├── src/
    │   ├── api/                    # 与后端 Controller 一一对应的接口调用
    │   ├── views/                  # 各功能页面
    │   ├── router/index.js         # 路由与角色权限定义
    │   ├── store/                  # Vuex 状态管理（登录态、用户信息）
    │   └── utils/request.js        # axios 拦截器与 Token 刷新逻辑
    ├── electron/main.js            # Electron 桌面壳入口
    ├── .env.electron.example       # 打包 exe 的环境变量模板
    └── .env.example                # 浏览器开发的环境变量模板
```

### 技术栈

| 层次 | 技术 |
|------|------|
| 后端框架 | Spring Boot 2 |
| ORM | MyBatis-Plus |
| 认证 | Spring Security + JWT |
| 缓存 | Redis |
| 实时通信 | WebSocket（Spring） |
| 数据库 | MySQL |
| API 文档 | Knife4j（Swagger 增强版） |
| 前端框架 | Vue 2 + Element UI |
| 状态管理 | Vuex |
| HTTP 客户端 | axios |
| 桌面打包 | Electron |
| 前端构建 | Vue CLI / webpack |

### 推荐阅读顺序（快速理解全貌）

#### 后端

1. `ExamApplication.java` — 启动入口与全局注解
2. `config/SecurityConfig.java` + `filter/VerifyTokenFilter.java` — JWT 认证流程
3. `controller/AuthController.java` + `service/impl/AuthServiceImpl.java` — 登录注册逻辑
4. `service/impl/ExamServiceImpl.java` — 考试核心流程（创建→开考→交卷→自动判分）
5. `service/impl/ManualScoreServiceImpl.java` — 主观题人工评分
6. `websocket/WebsocketHandler.java` — 实时监考与消息推送
7. `mapper/` + `model/entity/` — 数据表结构，与数据库一一对应

#### 前端

1. `src/main.js` — 入口文件、路由守卫、WebSocket 初始化
2. `src/router/index.js` — 全部路由与角色权限（meta.roles）
3. `src/utils/request.js` — axios 拦截器与自动 Token 刷新
4. `src/store/modules/user.js` — 登录状态与"记住我"逻辑
5. `src/api/` — 按业务模块浏览，与后端 Controller 对应
6. `src/views/exam/` — 考试相关页面（学生答题、教师管理、切屏检测等）
7. `electron/main.js` — 桌面壳配置与全屏参数

### API 接口模块列表

| 模块 | 路径前缀 | 说明 |
|------|---------|------|
| 认证 | `/api/auth` | 登录、注册、刷新 Token |
| 用户 | `/api/user` | 用户 CRUD、修改密码 |
| 班级 | `/api/grade` | 班级管理、学生分配 |
| 题目 | `/api/question` | 题目 CRUD、批量导入 |
| 题库 | `/api/repo` | 题目仓库管理 |
| 分类 | `/api/category` | 题目分类管理 |
| 考试 | `/api/exam` | 考试全生命周期管理 |
| 答卷 | `/api/answer` | 学生提交答案 |
| 评分 | `/api/score` | 主观题打分 |
| 记录 | `/api/record` | 考试记录查询 |
| 练习 | `/api/exercise` | 刷题功能 |
| 错题本 | `/api/userBook` | 错题收藏与重做 |
| 讨论 | `/api/discussion` | 帖子与回复 |
| 公告 | `/api/notice` | 系统通知 |
| 统计 | `/api/stat` | 数据统计接口 |
| 证书 | `/api/certificate` | 证书颁发与查询 |
| 文件 | `/api/file` | 图片/附件上传 |
| 日志 | `/api/log` | 操作日志查询 |

完整接口文档启动后见：`http://127.0.0.1:8080/doc.html`

---

## 待完善功能与已知差距

以下功能在设计文档中有规划，但当前版本尚未完整实现，后续迭代时可重点关注：

### 防作弊（学生端安全）

| 功能 | 当前状态 | 说明 |
|------|---------|------|
| 全屏锁定 | 已实现（应用级） | Electron kiosk 模式，但**不能**屏蔽 Alt+Tab、任务管理器等系统快捷键（内核级屏蔽需额外开发） |
| 切屏检测 | 已实现 | 切屏次数记录并上报教师端 |
| 离线答题 | 未实现 | 需要本地 SQLite 存储 + 网络恢复后同步冲突解决逻辑 |
| 人脸识别身份核验 | 未实现 | 需接入第三方 AI 接口并设计降级策略 |

### AI 辅助功能

| 功能 | 当前状态 | 说明 |
|------|---------|------|
| AI 辅助评分 | 部分实现 | 超时降级逻辑、「待人工批阅」状态字段需与需求文档 2.5.1 完整对齐 |
| 智能组卷 | 未实现 | 基于知识点和难度自动推荐题目组合 |
| 学习建议生成 | 未实现 | 根据错题和成绩趋势给学生个性化建议 |

### 其他待完善项

- **生产部署**：`application-prod.yml` 已准备环境变量占位，但 Nginx 反向代理、HTTPS 证书、Docker 镜像等部署脚本尚未提供
- **批量导题**：Excel 批量导入题目功能接口已有，但前端页面尚未完整
- **证书模板**：证书样式自定义功能规划中

> 如果课程作业只需「系统能跑起来 + 学生端 exe + 运行说明」，按本文"快速体验"和"打包 exe"两节操作即可满足要求。如需完整对标设计文档，请按上表逐项立项开发。

---

## 安全注意事项

**推送到 GitHub 之前，必须确认以下事项：**

- **不要**把真实数据库密码、JWT 密钥、AES 密钥、云厂商 AccessKey、AI 平台 API Key 等提交到仓库
- 后端敏感配置已改为环境变量占位（`${变量名}`），说明见 `online-exam-system-backend/env.example`
- 前端敏感配置模板见 `.env.example` 和 `.env.electron.example`；本地实际使用的 `.env.development.local` 和 `.env.electron` 已被 `.gitignore` 忽略
- 如果过去曾经不小心把真实密钥提交过，请**立即在对应平台作废旧密钥并重新生成**

**AES 加密密钥对齐（重要）：**

前端环境变量 `VUE_APP_CRYPTO_KEY` / `VUE_APP_CRYPTO_IV` 必须与后端 `EXAM_AES_KEY` / `EXAM_AES_IV` 保持一致（各 16 个字符）。如果三端（浏览器开发版、Electron 打包版、Spring Boot 后端）的密钥不一致，登录时密码加密/解密会失败，表现为"用户名或密码错误"但实际账号密码是正确的。

---

*最后更新：2026-05-06*
