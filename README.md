# 在线考试系统（前后端 + 学生端 Windows 打包说明）

本目录包含两个子项目，与《在线考试系统需求分析文档》（2026-05-03）对应：

| 目录 | 技术栈 | 在需求文档中的定位 |
|------|--------|-------------------|
| `online-exam-system-backend` | Spring Boot 2 + MyBatis-Plus + Redis + JWT | 认证、题库、考试、阅卷、证书、WebSocket 等服务端能力 |
| `online-exam-system-frontend` | Vue 2 + Element UI + Vuex | 学生/教师/管理员共用的 Web 界面；可经 Electron 打包为学生端 `.exe` |

文档中部分能力（如内核级快捷键屏蔽、SQLite 离线卷、人脸与第三方 AI 的完整降级策略）需要持续迭代；当前仓库在开源项目基础上已做：**Electron 学生端壳、打包用环境变量、验证码/WebSocket 在 `file://` 下可用、关键入口中文注释**。

**推送到 GitHub 前**：勿将真实数据库口令、JWT 密钥、云厂商 AccessKey、Coze/Dify/大模型 API Key 等写入仓库。后端已改为在 `application-*.yml` 中用 `${环境变量}` 占位，模板见 `online-exam-system-backend/env.example`；前端敏感项见 `online-exam-system-frontend/.env.example` 与 `.env.electron.example`。若历史上曾把真实密钥提交过，请在对应平台**立即轮换/作废**旧密钥。

---

## 一、环境准备

1. **JDK 8**、**Maven 3.x**  
2. **MySQL**（库名与 `application-dev.yml` 中一致，默认 `db_exam`）  
3. **Redis**（与 `application-dev.yml` 中 host/port 一致）  
4. **Node.js**（建议 16 LTS 或以上，用于前端）  
5. 按需启动 **MinIO**（后端 `application-dev.yml` 已配置本地 endpoint 时）

数据库脚本：见后端项目中的 `lib` 文件夹（README 中亦有说明）。

### Windows 常见启动阻塞（先按这里排查）

1) **终端提示找不到 `mvn`**  
说明你本机未安装 Maven，或 Maven 未加入环境变量 PATH。请安装 Maven 3.x，并确保命令行能执行：

- `mvn -version`

2) **`java -version` 直接闪退/无输出**  
你机器上可能存在多个 Java（例如 `Oracle\Java\javapath` 的“快捷入口”优先级更高），导致 `java` 指向了异常的路径。处理方式（任选其一即可）：

- **推荐**：安装 **JDK 8 或 JDK 11**，设置 `JAVA_HOME` 为该 JDK 目录，并把 `%JAVA_HOME%\bin` 放到 PATH 最前面，然后重新打开终端验证 `java -version`。  
- 或者：在 PATH 里把 `C:\Program Files\Common Files\Oracle\Java\javapath` 这类条目移动到后面/移除，再验证 `java -version`。

> 本仓库后端以 Java 8 编译目标（`pom.xml` 里为 1.8）；用 JDK 8/11 最省心。

3) **Node 版本过新导致前端依赖“引擎不支持”警告**  
如果你当前 Node 是 22+，`npm install` 可能会出现 `EBADENGINE` 警告（不一定会失败，但可能带来奇怪问题）。建议切到 **Node 16 LTS** 再运行前端（例如使用 nvm-windows 管理多版本）。

4) **你还没安装 MySQL / Redis**（最常见卡点）  
后端默认需要：
- **MySQL**：`127.0.0.1:3306`，库名 `db_exam`，账号 `root`，密码 `root`
- **Redis**：`127.0.0.1:6379`，无密码（默认）

你可以走两条路线：
- **路线 A（新手推荐，图形化安装）**：安装 MySQL + 安装 Memurai（Redis 兼容服务，Windows 上更省心）  
- **路线 B（进阶）**：装 WSL2 / Docker，用 Linux 版 Redis/MySQL（更“正统”，但步骤更多）

---

## 二、启动项目（开发）

### 1. 启动后端

```bash
cd online-exam-system-backend
# 一般不用配环境变量，直接启动即可（默认值在 application-dev.yml）。
# 若要改数据库密码等：Windows 里搜「环境变量」新建用户变量，变量名见 online-exam-system-backend/env.example 里的说明。
mvn spring-boot:run
```

`env.example` 只是**人看的说明书**（变量名叫什么），不是程序自动读取的配置文件。覆盖默认值时在系统或 IDE 里设置同名环境变量即可（例如 `MYSQL_PASSWORD`、`JWT_SECRET`、`EXAM_AES_KEY`）。**`EXAM_AES_KEY` / `EXAM_AES_IV` 须与前端 `VUE_APP_CRYPTO_KEY` / `VUE_APP_CRYPTO_IV` 一致（各 16 字符）。** 若数据库用户是在本仓库改为环境变量**之前**注册的，请在你本地保存的「旧 AES 密钥」上对齐三端环境变量，否则登录时前端加密与后端解密不一致；迁移完成后建议改为新的随机 16 字符并通知用户必要时重设密码。

默认 API 端口：**8080**。接口前缀一般为 **`/api`**。Knife4j 文档地址以控制台或配置为准（常见为 `http://127.0.0.1:8080/doc.html`）。

### 2. 启动前端（浏览器）

```bash
cd online-exam-system-frontend
# 可选：复制 .env.example 为 .env.development.local 覆盖本地 API/密钥（.local 文件已被 .gitignore 忽略）
npm install
npm run dev
```

默认前端端口：**9527**，已通过 `vue.config.js` 将 **`/api`** 代理到 `http://127.0.0.1:8080`。

浏览器访问控制台打印的本地地址，使用管理员在「用户管理」中创建的账号登录（学生 / 教师 / 管理员三种角色）。

### 3. 以 Electron 窗口调试学生端（可选）

需已安装依赖；会同时启动 Vue 开发服务与 Electron：

```bash
cd online-exam-system-frontend
npm run electron:dev
```

考试全屏演示（kiosk，浏览器级）：关闭上述进程后，在项目目录执行：

```bash
npx cross-env EXAM_KIOSK=1 npm run electron:dev
```

或在打包后的快捷方式上增加参数 `--exam-kiosk`（见 `electron/main.js` 注释）。

---

## 三、打包为 Windows `.exe`（学生端）

原理：使用 **Electron** 加载已构建的 Vue 静态资源（`dist`），API 与 WebSocket 地址在 **`.env.electron`**（构建时注入；仓库内提供 **`.env.electron.example`**，本地可复制为 `.env.electron` 再改，且 `.env.electron` 已列入 `.gitignore` 避免误提交），生成文件在 **`online-exam-system-frontend/release/`**。

1. 确认学生机能访问后端。首次打包请执行：`copy .env.electron.example .env.electron`（macOS/Linux 用 `cp`），再编辑 **`online-exam-system-frontend/.env.electron`**，将 `VUE_APP_BASE_API`、`VUE_APP_WS_URL` 改为实际 **http(s)/ws(s)** 地址，并保证 **`VUE_APP_CRYPTO_KEY` / `VUE_APP_CRYPTO_IV` 与后端 `EXAM_AES_KEY` / `EXAM_AES_IV` 一致**。  
2. 执行：

```bash
cd online-exam-system-frontend
npm install
npm run electron:dist
```

产物说明：

- **`portable` 目标**：绿色便携 **`.exe`**，适合拷贝到机房学生机。  
- **`nsis` 目标**：安装向导 **`.exe`**，适合需要安装目录与快捷方式的场景。

**注意**：学生机仍需能访问你配置的 API 与 WebSocket 地址；`.exe` 不包含 Java 后端，后端需单独部署或在局域网另一台机器运行。

---

## 四、建议的「读代码顺序」（快速建立全局观）

### 后端（`online-exam-system-backend`）

1. `ExamApplication.java` — 启动注解与文档索引注释。  
2. `config/SecurityConfig.java`、`filter/VerifyTokenFilter.java` — 登录后 JWT 如何进 SecurityContext。  
3. `controller/AuthController.java` + `service/impl/AuthServiceImpl.java` — 登录注册与令牌。  
4. `service/impl/ExamServiceImpl.java` — 考试创建、开考、交卷、客观题判分等主流程。  
5. `service/impl/ManualScoreServiceImpl.java`、`AutoScoringServiceImpl.java` — 主观题与客观题评分。  
6. `websocket/WebsocketHandler.java` — 监考与推送。  
7. `mapper` 与 `model/entity` — 与表结构一一对应，对照需求第 6 章数据实体。

### 前端（`online-exam-system-frontend`）

1. `src/main.js` — 入口与路由守卫、WebSocket 初始化。  
2. `src/permission.js` — 进度条与标签页逻辑。  
3. `src/router/index.js` — 页面与角色。  
4. `src/utils/request.js` — axios 拦截器与 Token 刷新。  
5. `src/store/modules/user.js` — 登录态与「记住我」。  
6. `src/api` — 按业务模块阅读，与后端 Controller 对应。  
7. `src/views` — 具体页面；学生考试相关可搜「考试」「切屏」等关键词。  
8. `electron/main.js` — 桌面壳与全屏参数。

---

## 五、需求文档与当前实现的差距（便于验收与二期规划）

已在代码注释中标注的条目包括但不限于：Electron 全屏为**应用级 kiosk**，**不等同**于文档 STU-06 中内核级屏蔽 Alt+Tab / 禁止任务管理器；离线答题 STU-09 若需 SQLite 与冲突合并，需单独数据层设计；AI 辅助评分需对照文档 2.5.1 统一超时与「待人工批阅」降级字段。

若课程作业仅需「可运行 + 学生端 exe + 说明文档」，按本文第二、三节操作即可；若需完整对标需求矩阵，请按第五节逐项立项开发。
