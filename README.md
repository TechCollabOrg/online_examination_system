# 在线考试系统

> 一个支持学生答题、教师出卷阅卷、管理员统筹的全功能在线考试平台。
> 学生端可打包为 Windows `.exe`，在没有浏览器的机房也能运行。

---

## 子模块说明（开发时优先看）

| 目录 | 说明 |
|------|------|
| [online-exam-system-backend/README.md](online-exam-system-backend/README.md) | 后端启动、配置、`sql/`、API 索引与排错 |
| [online-exam-system-frontend/README.md](online-exam-system-frontend/README.md) | 前端启动、路由、代理、Electron 打包与排错 |

> 修改代码时，Cursor 会自动根据 `.cursor/rules/readme-sync*.mdc` 提醒同步更新对应 README。

---

## 目录

- [这个系统能做什么？](#这个系统能做什么)
- [三种角色功能一览](#三种角色功能一览)
- [快速体验（第一次运行）](#快速体验第一次运行)
- [环境准备详解](#环境准备详解)
- [启动项目（开发模式）](#启动项目开发模式)
- [打包为学生端 .exe](#打包为学生端-exe)
- [常见启动问题排查](#常见启动问题排查)（含教师查看详情、学生参加考试）
- [开发者参考](#开发者参考)
- [待完善功能与已知差距](#待完善功能与已知差距)
- [安全注意事项](#安全注意事项)

---

## 这个系统能做什么？

这是一套**在线考试平台**，主要用于学校或培训机构：

- **学生**：在网页或桌面程序里参加考试、平时刷题、查看成绩和错题
- **教师**：创建题库、出卷、发布考试、批阅主观题、查看班级统计
- **管理员**：管理用户账号、班级分组、系统公告、操作日志

系统支持**单选题、多选题、判断题、简答题、复合题**五种计分题型，客观题自动批改，主观题由教师人工打分。复合题（类型 5）在组卷时单独统计数量与默认分值，不再并入简答题。

---

## 三种角色功能一览

### 学生能做什么


| 功能   | 说明                       |
| ---- | ------------------------ |
| 试卷中心 | 查看自己班级发布的所有考试，点击参加       |
| 参加考试 | 浏览器为网页全屏；学生端 `.exe` 为系统窗口全屏（主进程控制）。交卷后退出全屏。切屏会被记录 |
| 刷题中心 | 练习题库中的题目，随时可做不计入成绩       |
| 考试记录 | 交卷后即可查看（含「待批改」状态）；详情页展示每题得分/满分 |
| 刷题记录 | 查看自己的刷题历史                |
| 错题本  | 自动收集做错的题目，可重新练习          |
| 讨论区  | 与同学和老师讨论题目疑问             |
| 个人中心 | 修改头像、昵称、密码               |
| 我的证书 | 查看通过考试获得的电子证书            |
| 首页在线时长 | 登录后每约 5 分钟上报一次心跳；**数据库按秒累计**，首页图表纵轴为**分钟**（秒÷60）。单日最多显示 24 小时。若曾出现「一天九十多小时」，多为旧版把**秒数当成分钟**展示或历史脏数据；请 **Ctrl+F5 强刷** 并重启前后端。仍异常时在 MySQL 执行一次 `online-exam-system-backend/sql/fix_user_daily_login_duration_cap.sql` |


### 教师能做什么


| 功能   | 说明                    |
| ---- | --------------------- |
| 题库管理 | 新建、编辑、删除题目，支持四种题型     |
| 题目分类 | 给题目打标签分类，方便组卷         |
| 试题仓库 | 管理题目集合，按类别组织          |
| 考试管理 | 创建考试（设置时间、题目、分数、通过分线）；「查看详情」可预览试卷并查看各班级**缺考名单** |
| 阅卷评分 | 批改简答题；阅卷管理可查看「待批阅」与「缺考名单」 |
| 班级管理 | 查看班级学生名单，分配考试         |
| 成绩统计 | 查看班级整体成绩；在「用户成绩」详情页饼图按**及格线**分段：不及格 **D、E**，及格及以上 **A、B、C**（分数越高档越高）；及格分在卡片标题旁；饼图标题在图上方、**图例在图下方**，绿系为及格档、红橙为不及格档 |
| 讨论管理 | 管理学生的讨论帖，回复问题         |
| 公告通知 | 发布班级通知                |

### 试题图片（教师录入）

在「题库管理 → 添加/编辑试题」中，**题目内容（题干）**使用与「选项解析」「简答参考答案」相同的**富文本编辑器**：可分段、标题、列表、加粗，并点击工具栏 **「图片」** 在正文中**多次插入**配图。仍可使用 **「试题图片」** 单独批量挂图（与正文内嵌图二选一即可，避免同一套图维护两处）；若正文里已有 `<img>`，保存时会清空「试题图片」字段以免学生端重复展示。打开旧题编辑时，若曾仅用「试题图片」而未在正文插图，会自动把附图**合并进**题目内容富文本。

**题干**与**客观题各选项**仍可单独上传多张附图（上传组件默认最多 **500** 张/处）。多张 URL 在库中用 **###**（三个半角井号）拼成一条字符串；旧数据单 URL 不受影响。若 Excel 导入一格多图，可用 **###** 连接多个地址（常由导题脚本生成）。**简答题参考答案**不在此列，而在下方「参考答案（图文）」富文本中内嵌图片（见下段）。

**客观题（单选 / 多选 / 判断）每个选项**还可单独填写「选项解析」：使用富文本编辑器，可**分段、标题、列表、加粗**，并点击工具栏 **「图片」** 在解析正文中**多次插入**配图（与「选项图片」列不同：选项图片是选项本身的附图；解析内图存在选项的 `analysis` 富文本 HTML 里）。与上方「整题解析」并存；学生端在交卷后、刷题提交后、错题本判题后等页面会按选项展示。

**简答题参考答案**：题型选「简答题」后，在**同一富文本框**中录入（分段、多图与选项解析相同），不再与「答案文字 / 答案图片」分两栏。打开旧题目编辑时，若曾单独填写「答案附图」，会自动并入该富文本；保存后参考答案只保留在 `content` 的 HTML 中。

**已有数据库**：原表 `image` 列为 `varchar(255)` 时，多张长链接可能被截断。请在 MySQL 中执行一次 `online-exam-system-backend/sql/alter_question_option_image_mediumtext.sql`（把该列改为 `MEDIUMTEXT`）。全新按 `db_exam.sql` 建库时已包含较长字段类型。

若题库是旧版本、还没有选项解析列，请在 MySQL 中**再执行一次** `online-exam-system-backend/sql/alter_t_option_analysis.sql`（为 `t_option` 表增加 `analysis` 字段，类型为 `MEDIUMTEXT`）。若执行报错提示列已存在，说明已加过：若当时加的是 `TEXT`，建议再执行一次 `online-exam-system-backend/sql/alter_t_option_analysis_mediumtext.sql`，以免富文本里图片很多、HTML 过长被截断。

若 `t_option.content` 仍为 `TEXT`（简答参考答案 HTML 过长可能被截断），请执行一次 `online-exam-system-backend/sql/alter_t_option_content_mediumtext.sql`。

若 `t_question.content` 仍为 `TEXT`（题干富文本 HTML + 多图可能较长），请执行一次 `online-exam-system-backend/sql/alter_t_question_content_mediumtext.sql`。

### 材料题 / 同一题干下多小题（26、27 那种）

若一道大题里有多道**各自有完整选项、各自作答**的小问，但共用一段材料或示意图：

1. 在题库中先建一条「**仅作材料用**」的父题（`t_question` 一行）：题型选 **「共用材料」(类型 5)**，把共用文字、示意图放在该行的题干与试题图片里（无选项）；组卷时可直接勾选这条父题，系统会自动勾选同组小题。若使用旧数据，父题仍可为 **简答题 (4)**，效果相同但列表里会显示为简答。
2. 再为每个小问各建一条正常题目（各有自己的 `content` 小问描述与 `t_option`），并在这些小题的 **`parent_qu_id`** 上填**父题的数据库 id**（同一父 id 表示「同一大题」）。
3. **已有库**若还没有该列：在 MySQL 中执行一次 `online-exam-system-backend/sql/alter_question_parent_qu_id.sql`。全新按 `db_exam.sql` 建库时已包含该列。

学生端考试、刷题、错题本、交卷前汇总、考后解析页等：会在该小题上方自动展示**共用题干**区，并标注「同一大题 · 共用题干」；答题卡上悬停题号可看到「与同组小题共用题干」提示。

**Excel 批量导入（推荐）**：模板 `public/template/ImportQuestionTemplate.xlsx` 末尾有三列（第 23～25 列）：**材料组编号**、**共用材料题干**、**共用材料题干图片**。同一材料下的多道小题填写**相同**的材料组编号（如 `G001`）；**该组第一行**必须填写「共用材料题干」（整段材料文字），「共用材料题干图片」可填可不填；**每一行**的「试题类型」「各选项」按**单个小问**填写；「题干」列可写 `(1)…`、`(2)…` 等小问说明，**也可留空**（仅共用材料、小问只有选项时常见）。从第二行起「共用材料题干」可留空。**未填材料组编号**的普通题仍须填写「题干」。导入时会自动插入一条 **共用材料（类型 5）** 父题并给各小题写好 `parent_qu_id`（父题不是简答题、无选项；组卷勾选父题时系统会自动勾选同组小题，且父题不会进入计分题型统计）。

**教师端手动录入**：在「新增试题」页填写 **共用材料父题 ID**（可先在列表里看 **共用材料** 或简答题父题的 **ID** 列，或点该行 **材料下小问** 自动带上）；**题目内容**用富文本写本小问（可分段插图）；客观题选项不够点表格 **添加** 增加行。保存后可点 **保存并继续添加同材料下一小问** 连续录多小问。

**前端依赖**：选项解析依赖 Quill 富文本（项目已内置 `vue-quill-editor`）。在 `online-exam-system-frontend` 目录执行 `npm install` 后，根依赖中的 `quill` 会固定为 **1.3.7**（与 `vue-quill-editor` 兼容）。若本地仍报错，删除 `node_modules` 后重新 `npm install`。

### 管理员能做什么


| 功能   | 说明                |
| ---- | ----------------- |
| 用户管理 | 创建/停用账号，分配学生或教师角色 |
| 班级管理 | 创建班级，批量导入学生       |
| 日志查看 | 查看所有操作记录          |
| 考试管理 | 对所有考试有完整管理权限      |
| 统计报表 | 全站数据概览            |
| 证书管理 | 配置和颁发电子证书         |


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

然后在 MySQL 客户端（如 Navicat 或命令行）中运行 `online-exam-system-backend/sql/` 目录下的 `db_exam.sql`（或你实际使用的初始化脚本）。

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
>
> | 角色  | 用户名       | 密码       |
> | --- | --------- | -------- |
> | 管理员 | `admin`   | `123456` |
> | 教师  | `teacher` | `123456` |
> | 学生  | `student` | `123456` |
>
>
> 正式上线前请及时修改以上密码。

---

## 环境准备详解

### 所需软件版本


| 软件      | 版本要求   | 说明                           |
| ------- | ------ | ---------------------------- |
| JDK     | 8 或 11 | 后端以 Java 8 为目标编译，JDK 11 也兼容  |
| Maven   | 3.x    | 后端构建工具                       |
| MySQL   | 5.7+   | 数据库，库名 `db_exam`             |
| Redis   | 任意稳定版  | 缓存与会话，Windows 推荐 Memurai     |
| Node.js | 16 LTS | 前端开发环境；**不推荐 18+**，可能有依赖兼容问题 |
| MinIO   | 可选     | 文件（图片、附件）存储，不配置则禁用文件上传       |


### 默认连接配置（`application-dev.yml`）


| 服务           | 地址                               | 账号     | 密码     |
| ------------ | -------------------------------- | ------ | ------ |
| MySQL        | `127.0.0.1:3306`                 | `root` | `root` |
| Redis        | `127.0.0.1:6379`                 | —      | 无密码    |
| 后端 API       | `http://127.0.0.1:8080`          | —      | —      |
| 前端页面         | `http://localhost:9527`          | —      | —      |
| Knife4j 接口文档 | `http://127.0.0.1:8080/doc.html` | —      | —      |


如需修改数据库密码等，在系统环境变量中设置对应变量名（变量名见 `online-exam-system-backend/env.example`）即可覆盖默认值，**无需修改代码**。

---

## 题库导入：Word 转 Excel（批量导题）

系统的题库批量导入使用 Excel 模板（项目自带模板在 `online-exam-system-frontend/public/template/ImportQuestionTemplate.xlsx`）。

如果你的题目在 Word（`.docx/.doc`）里，可以用项目自带的转换脚本先生成同结构的 `.xlsx`，再去后台导入：

- **脚本位置**：`题库处理/convert_word_to_import_xlsx.py`
- **使用说明**：见 `题库处理/README.md`
- **多小问 / 材料题**：Word 里若使用 `【问题1】` / `[问题1]` 这类标记，脚本会按**材料组编号**写出多行（同组连续、首行共用材料），各小问可分别为单选/多选/判断/简答且**选项互不共用**；导入后父题为 **共用材料（类型 5）**，各小问带 `parent_qu_id`。

最简单的运行方式（PowerShell，复制就能用）：

```powershell
cd .\题库处理
python -m pip install -r .\requirements.txt

python .\convert_word_to_import_xlsx.py --out-dir D:\题库\out `
  "D:\题库\你的题库文件1.docx" `
  "D:\题库\你的题库文件2.doc"
```

生成的 `.xlsx` 就可以在教师端的“题库管理 / 批量导入”里上传使用。

如果你希望**每套卷子分别整理成一个 Excel**（推荐），加上 `--per-paper`：

```powershell
cd .\题库处理
python .\convert_word_to_import_xlsx.py --per-paper --out-dir D:\题库\out `
  "D:\题库\2021年11月系统架构师真题（综合知识+答案解析）.docx" `
  "D:\题库\2026jzz组内测试试题一.docx"
```

若你本地另有导题模板（例如 `D:\导入试题模板.xlsx`），用 `--template` 指定即可，结构须与系统模板一致。需要把题目里的图片上传到 MinIO 并在 Excel 里写链接时，加上 `--minio-endpoint` 等参数（详见 `题库处理/README.md`）；**MinIO 地址要填你本机能连通的 API 地址**（例如 `http://10.8.117.254:9000`），否则上传会卡住或失败。

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
- `/api` 与 `/websocket` 请求自动代理到后端 `8080`，无需手动配置跨域（讨论区发评论、公告推送等实时功能依赖 WebSocket）

**讨论区提示「WebSocket 已关闭」时怎么查：**

1. 确认后端已启动（`8080` 端口可访问）。
2. 修改 `vue.config.js` 或 WebSocket 相关代码后，需 **重启前端** `npm run dev`。
3. 浏览器按 `F12` → `Network` → 筛选 `WS`，应看到连到 `ws://localhost:9527/websocket?userId=…` 且状态为 `101`；若是 `401`/`403`，请重新登录后再试。

#### 让同学在同一局域网访问你的前端（开发模式）

适用场景：你在自己电脑上启动项目，同学用浏览器访问你电脑的前端页面。

- **你需要同时启动**：
  - 后端：`mvn spring-boot:run`（默认 `8080`）
  - 前端：`npm run dev`（默认 `9527`）
- **你本机前端需要监听所有网卡**：已在 `online-exam-system-frontend/vue.config.js` 设置 `devServer.host = '0.0.0.0'`。
- **同学访问地址**（把下面的 IP 换成你的实际 IP）：
  - 登录页：`http://你的IP:9527/#/login`
  - 例如你是 `10.8.104.30`：`http://10.8.104.30:9527/#/login`

如果同学打不开，优先检查：

- Windows 防火墙是否放行 **9527**（前端）和 **8080**（后端）的入站访问
- 校园网/路由器是否启用了“客户端隔离”（会导致同学之间互相访问不了）
- 如果登录时提示“没有权限访问该资源（403）”，打开浏览器按 `F12` → `Console`，把里面 `[HTTP 403]` 的 `url` 和 `backendMsg` 截图发出来，便于定位是哪个接口被后端拦截

如果是“验证码校验/登录”阶段就出现 403，通常是 **Cookie 没有保存成功**（后端可能写了 `Domain=127.0.0.1`，导致用 `10.x` 访问时浏览器丢弃 Cookie）。本项目已在 `vue.config.js` 的代理里启用 `cookieDomainRewrite: ''` 来规避该问题；修改后需要 **重启前端**（`npm run dev`）生效。

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


| 文件类型             | 适用场景                |
| ---------------- | ------------------- |
| `*-portable.exe` | 绿色版，直接复制到学生机运行，无需安装 |
| `*-setup.exe`    | 安装包，有安装向导和桌面快捷方式    |


> **注意**：`.exe` 不包含 Java 后端。后端需要在另一台服务器（或局域网机器）上单独运行，学生机通过网络连接。

**考试全屏（学生端 .exe）**：点击「开始考试」后，渲染进程会通知主进程执行 `BrowserWindow.setFullScreen(true)`，与浏览器是否允许「网页全屏」无关，一般可稳定铺满屏幕。交卷后会 `setFullScreen(false)` 恢复窗口（若用下面「机考 kiosk」方式启动，则整场已是 kiosk，交卷不会退出 kiosk，需关闭程序退出）。

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

### 问题 6：考试页没有自动全屏

分两种环境：

**1）普通浏览器**

使用 **Fullscreen API**（网页全屏）。在「准备考试」页点击 **开始考试** 时会**先等待进入全屏**再调用开考接口并跳转到答题页，减少「进了考试页但未全屏」的竞态；若仍被浏览器拦截，请在地址栏允许本站全屏，或在答题页点遮罩 / **进入全屏**。交卷后会退出网页全屏。按 **Esc** 会退出全屏，遮罩会再次出现。

**2）学生端 `.exe`（Electron）**

使用主进程 **系统窗口全屏**（`setFullScreen`），不依赖浏览器手势，进入考试时一般会自动铺满。若仍异常，可点答题页 **进入全屏** 或重启客户端。若用 `EXAM_KIOSK=1` / `--exam-kiosk` 启动，启动后窗口已是机考全屏，逻辑上视为「已在全屏」。

### 问题 7：教师点「查看详情」提示 *The request was rejected because the URL was not normalized*

这是请求路径里出现了**连续双斜杠**（例如 `.../exams//details//1`），Spring Security 会直接拒绝。请使用已修复的前端代码（`exams/details/{考试id}`）。若你本地改过接口地址，请避免在路径中拼出 `//`。

### 问题 8：学生在哪里考试？没有单独的「发布」按钮？

本系统里**没有**再点一次「发布考试」的步骤：教师在**创建考试时**勾选「考试班级」，保存成功后，该场考试就会出现在对应班级学生的**试卷中心**里。

学生操作路径：**用学生账号登录** → 左侧菜单 **试卷中心** → 列表里在考试开始与结束时间之间会显示 **开始考试** → 进入 **准备考试** 页再点开始答题。

注意：学生账号必须在管理员或教师处**加入与考试相同的班级**，且当前时间要在考试的 **开始时间～结束时间** 内，否则按钮会是「未开始」或「已结束」且不可点。

### 问题 9：交卷时提示网络错误 / 连接后端失败

按下面顺序排查（**交卷进行中请勿重复点击**，避免重复提交）：

1. **确认后端已启动**：本机浏览器开发时，后端应在 `http://127.0.0.1:8080`；学生端 `.exe` 需在 `.env.electron` 里把 `VUE_APP_BASE_API` 写成**能访问到后端的完整地址**（例如 `http://192.168.1.10:8080/api`），不能只写 `127.0.0.1`（别的电脑连不上）。
2. **题量很大时稍等**：交卷要汇总判分，已把接口超时放宽到约 2 分钟；若仍超时，先重启后端再交卷一次。
3. **时间刚到自动交卷**：服务器与个人截止时间允许约 60 秒宽限；若提示「已过交卷时间」，说明确实超时，需联系教师处理成绩。
4. **看浏览器控制台（F12）**：若是 `401` 请重新登录；若是 `500` 把报错信息发给管理员。

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
│   └── sql/                        # 数据库初始化与变更 SQL（含 db_exam.sql）
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


| 层次       | 技术                    |
| -------- | --------------------- |
| 后端框架     | Spring Boot 2         |
| ORM      | MyBatis-Plus          |
| 认证       | Spring Security + JWT |
| 缓存       | Redis                 |
| 实时通信     | WebSocket（Spring）     |
| 数据库      | MySQL                 |
| API 文档   | Knife4j（Swagger 增强版）  |
| 前端框架     | Vue 2 + Element UI    |
| 状态管理     | Vuex                  |
| HTTP 客户端 | axios                 |
| 桌面打包     | Electron              |
| 前端构建     | Vue CLI / webpack     |


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


| 模块  | 路径前缀               | 说明             |
| --- | ------------------ | -------------- |
| 认证  | `/api/auth`        | 登录、注册、刷新 Token |
| 用户  | `/api/user`        | 用户 CRUD、修改密码   |
| 班级  | `/api/grade`       | 班级管理、学生分配      |
| 题目  | `/api/question`    | 题目 CRUD、批量导入   |
| 题库  | `/api/repo`        | 题目仓库管理         |
| 分类  | `/api/category`    | 题目分类管理         |
| 考试  | `/api/exam`        | 考试全生命周期管理      |
| 答卷  | `/api/answer`      | 学生提交答案         |
| 评分  | `/api/score`       | 主观题打分          |
| 记录  | `/api/record`      | 考试记录查询         |
| 练习  | `/api/exercise`    | 刷题功能           |
| 错题本 | `/api/userBook`    | 错题收藏与重做        |
| 讨论  | `/api/discussion`  | 帖子与回复          |
| 公告  | `/api/notice`      | 系统通知           |
| 统计  | `/api/stat`        | 数据统计接口         |
| 证书  | `/api/certificate` | 证书颁发与查询        |
| 文件  | `/api/file`        | 图片/附件上传        |
| 日志  | `/api/log`         | 操作日志查询         |


完整接口文档启动后见：`http://127.0.0.1:8080/doc.html`

---

## 待完善功能与已知差距

以下功能在设计文档中有规划，但当前版本尚未完整实现，后续迭代时可重点关注：

### 防作弊（学生端安全）


| 功能       | 当前状态     | 说明                                                          |
| -------- | -------- | ----------------------------------------------------------- |
| 全屏锁定     | 已实现（应用级） | Electron kiosk 模式，但**不能**屏蔽 Alt+Tab、任务管理器等系统快捷键（内核级屏蔽需额外开发） |
| 切屏检测     | 已实现      | 切屏次数记录并上报教师端                                                |
| 离线答题     | 未实现      | 需要本地 SQLite 存储 + 网络恢复后同步冲突解决逻辑                              |
| 人脸识别身份核验 | 未实现      | 需接入第三方 AI 接口并设计降级策略                                         |


### AI 辅助功能


| 功能      | 当前状态 | 说明                                  |
| ------- | ---- | ----------------------------------- |
| AI 辅助评分 | 部分实现 | 超时降级逻辑、「待人工批阅」状态字段需与需求文档 2.5.1 完整对齐 |
| 智能组卷    | 未实现  | 基于知识点和难度自动推荐题目组合                    |
| 学习建议生成  | 未实现  | 根据错题和成绩趋势给学生个性化建议                   |


### 其他待完善项

- **生产部署**：`application-prod.yml` 已准备环境变量占位，但 Nginx 反向代理、HTTPS 证书、Docker 镜像等部署脚本尚未提供
- **批量导题**：Excel 批量导入题目功能接口已有，但前端页面尚未完整
- **证书模板**：证书样式自定义功能规划中

> 如果课程作业只需「系统能跑起来 + 学生端 exe + 运行说明」，按本文"快速体验"和"打包 exe"两节操作即可满足要求。如需完整对标设计文档，请按上表逐项立项开发。

---

## 随机组卷（多题库）使用说明

- 入口：教师端创建考试页面 -> `随机抽题`
- 先点 `添加题库`，每一行都可以单独选择一个题库并填写各题型抽题数量；题型分值在表格上方统一设置一次即可
- 支持同时配置多个题库，保存时会按每一行配置分别抽题，不再限制只能从一个题库抽题
- 试卷总分会根据「各题型数量 × 对应分值」自动汇总；若一直为 0，请确认每类题「数量与分值都大于 0」且已选择题库
- 若提示"考试题库选择不正确"，请先确认该行题库已真正选中（下拉框有选中值），并至少填写一种题型数量

**自己选题（组卷信息第一个页签）**：不必先在「随机抽题」里绑定题库 ID；保存时后端会根据已选试题自动写入关联题库。上方可设置各题型**默认分值**（含**复合题**单独一项，与简答题分开统计）；勾选题目后，在下方「已选题目」列表中点击**设置分值**，可为任意单题单独改分（会显示「已改」标记）。题目列表右侧可点**查看详情**预览题干、选项与小题（复合题含共用材料与各小问）。修改题型默认分时，只会同步尚未单独改过的题目。试卷总分按各题分值相加自动计算。若题目存在材料父子结构，勾选父题会自动联动勾选同组子题，考试中会按试卷顺序连续出现。若提示「所选题目未关联题库」，请在试题管理中给相关题目指定所属题库后再保存。

**已有数据库升级**：若组卷保存报错缺少 `compound_count` 字段，请在 MySQL 执行一次 `online-exam-system-backend/sql/alter_t_exam_compound_type.sql`，然后重启后端。

**复合题编辑**：小题题干支持富文本与正文内插图；保存时会识别「仅有图片、无文字」的题干为已填写。批改试卷时，含简答小问的复合题会展示共用材料、各小题与考生作答。

**全客观题试卷**：若试卷实际只有单选/多选/判断（或复合题中无简答小问），学生交卷后系统自动判分，**无需进入阅卷**；教师打开「成绩分析」即可看到该场考试统计。若曾在阅卷页看到「0 题」或成绩分析无数据，请**重启后端**后刷新「成绩分析」页（系统会自动修正误标为待阅的记录）。

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

*最后更新：2026-05-21*