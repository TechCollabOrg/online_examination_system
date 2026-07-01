# 摄像头监考功能 — 配置与使用指南

> 适用分支：`feature/ai-integration`  
> 技术栈：LiveKit（音视频房间）+ MediaPipe（浏览器本地人脸检测）+ 后端事件 / 暂离 / WebSocket 告警

---

## 一、功能概览

| 角色 | 能力 |
|------|------|
| **教师** | 创建考试时开启监考；考试管理列表进入 **「监考」** 页，查看考生实时画面与告警 |
| **学生** | 答题页右下角摄像头预览；本地检测离屏 /Users/多人；可配置 **暂离** |
| **系统** | 告警写入数据库并通过 WebSocket 推送给考试创建教师；暂离超时由定时任务扫描 |

**本 MVP 未实现**：录像回看（LiveKit Egress）、生产级 TURN/HTTPS 部署脚本。

---

## 二、环境要求

| 项 | 要求 |
|----|------|
| MySQL | 已执行监考相关 SQL（见下文） |
| Docker | 用于运行 LiveKit Server（开发环境推荐） |
| 浏览器 | Chrome / Edge 等支持 WebRTC 的现代浏览器；需允许摄像头权限 |
| 网络 | 开发环境 LiveKit 默认 `ws://127.0.0.1:7880`；生产需 HTTPS + 公网可达 |

前端额外依赖：`livekit-client`（已在 `package.json` 中声明，需 `npm install`）。

---

## 三、配置步骤（按顺序做）

### 步骤 1：数据库

在 **与业务库相同** 的 MySQL 中执行：

```text
online-exam-system-backend/sql/alter_t_exam_proctor.sql
```

**作用**：

- `t_exam` 增加字段：`proctor_enabled`、`allow_leave`、`leave_max_minutes`、`leave_max_count`
- 新建表：`t_proctor_event`、`t_proctor_leave`、`t_proctor_presence`

**注意**：若 `ALTER TABLE` 报「列已存在」，跳过 ALTER 部分，只执行后面的 `CREATE TABLE` 即可。

**验证**：

```sql
SHOW COLUMNS FROM t_exam LIKE 'proctor_enabled';
SHOW TABLES LIKE 't_proctor_%';
```

应能看到监考相关列与三张新表。

---

### 步骤 2：启动 LiveKit Server

在项目根目录（与 `docker-compose.livekit.yml` 同级）执行：

```powershell
docker compose -f docker-compose.livekit.yml up -d
```

**验证**：

```powershell
docker compose -f docker-compose.livekit.yml ps
```

状态应为 `running`；本机可访问 WebSocket 地址 `ws://127.0.0.1:7880`。

**停止**：

```powershell
docker compose -f docker-compose.livekit.yml down
```

---

### 步骤 3：后端 LiveKit 配置

文件：`online-exam-system-backend/src/main/resources/application-dev.yml`（或通过环境变量覆盖）

```yaml
livekit:
  enabled: ${LIVEKIT_ENABLED:true}
  url: ${LIVEKIT_URL:ws://127.0.0.1:7880}
  api-key: ${LIVEKIT_API_KEY:devkey}
  api-secret: ${LIVEKIT_API_SECRET:secret}
  token-ttl-sec: ${LIVEKIT_TOKEN_TTL:7200}
```

| 配置项 | 说明 | 开发默认值 |
|--------|------|------------|
| `enabled` | 是否启用 LiveKit Token 签发 | `true` |
| `url` | 前端连接用的 WebSocket 地址 | `ws://127.0.0.1:7880` |
| `api-key` / `api-secret` | 与 LiveKit / docker-compose 一致 | `devkey` / `secret` |
| `token-ttl-sec` | Token 有效期（秒） | `7200` |

可在 `env.local` 中设置（勿提交 Git）：

```properties
LIVEKIT_ENABLED=true
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

**生产环境**：需改为实际 LiveKit 服务地址与密钥；浏览器页面须为 **HTTPS**，否则 WebRTC 可能受限。

---

### 步骤 4：安装前端依赖

```powershell
cd online-exam-system-frontend
npm install
```

确认 `package.json` 含 `"livekit-client": "^2.x"`。

---

### 步骤 5：启动系统

```powershell
# 项目根目录
.\start-all.bat
# 或
.\start-all.ps1
```

或分别启动后端（8080）与前端（9527）。

---

## 四、教师端 — 如何启用与使用

### 4.1 创建考试时开启监考

1. 登录 **教师** 账号 → **考试管理** → **添加考试**
2. 在表单中找到 **「启用摄像头监考」**，打开开关
3. （可选）配置 **允许暂离**：
   - **单次最长分钟**：如 5 分钟
   - **整场最多次数**：如 1 次
4. 正常组卷、选班级、保存

| 配置项 | 含义 |
|--------|------|
| 启用摄像头监考 | 学生进入答题页后会启动摄像头与 LiveKit |
| 允许暂离 | 学生可申请离开座位，超时记告警 |
| 单次最长分钟 | 一次暂离不得超过该时长 |
| 整场最多次数 | 整场考试累计暂离次数上限 |

### 4.2 进入监考页

1. **考试管理** 列表中，对已启用监考的考试会出现 **「监考」** 按钮
2. 点击进入 `/exam-proctor?examId=<考试ID>`
3. 左侧：进行中考生列表（在线 / 暂离 / 离线）
4. 中间：选中考生后显示实时画面
5. 右侧：告警记录；新告警会通过 WebSocket 弹通知

**前提**：考试已有学生 **进行中**（`state=0`），且学生端已成功连接 LiveKit 并发送心跳。

---

## 五、学生端 — 如何使用

1. 在 **试卷中心** 参加已启用监考的考试
2. 阅读考试说明（会提示需允许摄像头）
3. 进入 **答题页** 后，右下角出现摄像头小窗：
   - 首次会请求 **摄像头权限**，请选择允许
   - 状态显示「监考中」表示正常
4. 若教师允许暂离：
   - 点击 **「暂离」** → 选择时长 → 确认
   - 返回后点 **「我已返回」**

**本地检测（不上传视频到改卷服务器）**：

- 未检测到人脸 → 上报 `NO_FACE`
- 多人入镜 → `MULTIPLE_FACES`
- 人脸偏离 → `FACE_AWAY`
- 摄像头 / LiveKit 失败 → `CAMERA_OFF`

检测在浏览器内完成（MediaPipe CDN），仅 **事件类型** 上报后端。

---

## 六、API 一览（供联调 / 二次开发）

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/api/proctor/config/{examId}` | 学生/教师 | 监考配置 |
| GET | `/api/proctor/token?examId=&role=student\|proctor` | 学生/教师 | LiveKit Token |
| POST | `/api/proctor/events` | 学生 | 上报告警事件 |
| POST | `/api/proctor/heartbeat?examId=` | 学生 | 在线心跳 |
| GET | `/api/proctor/events?examId=&limit=` | 教师 | 告警列表 |
| GET | `/api/proctor/participants?examId=` | 教师 | 进行中考生 |
| POST | `/api/proctor/leave` | 学生 | 申请暂离 |
| POST | `/api/proctor/leave/return?examId=` | 学生 | 暂离返回 |

LiveKit 房间名：`oes-exam-{examId}`；身份：`student-{userId}` / `proctor-{userId}`。

---

## 七、常见问题

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 后端启动失败，`t_proctor_event` 不存在 | 未执行 SQL | 执行 `alter_t_exam_proctor.sql` 后重启 |
| 监考页提示「连接 LiveKit 失败」 | LiveKit 未启动或端口不对 | `docker compose -f docker-compose.livekit.yml up -d` |
| 列表无「监考」按钮 | 该场考试未勾选启用监考 | 编辑考试或新建时开启 |
| 学生无摄像头小窗 | 未进答题页 / 未启用监考 | 确认 `proctor_enabled=1` 且已进入 `/exam` 答题页 |
| 教师看不到画面 | 学生未连上 / 未选考生 | 让学生刷新答题页并授权摄像头；左侧选中考生 |
| 告警不弹窗 | 教师未保持 WebSocket | 保持教师页登录；检查浏览器控制台 WebSocket |
| `npm` 报缺少 `livekit-client` | 未安装依赖 | 在前端目录执行 `npm install` |
| 生产环境无法连摄像头 | HTTP 非 localhost | 使用 HTTPS 部署前后端与 LiveKit |

---

## 八、生产部署提示（进阶）

1. **LiveKit**：使用官方文档部署带 TLS 的 LiveKit，或使用 LiveKit Cloud；`livekit.url` 改为 `wss://...`）
2. **TURN**：跨网段 / 严格 NAT 需配置 TURN 服务器（LiveKit 配置内可指定）
3. **密钥**：`api-key` / `api-secret` 勿使用 dev 默认值；通过环境变量注入
4. **防火墙**：开放 LiveKit 所需端口（如 7880–7882、UDP）
5. **录像回看**：需额外配置 LiveKit Egress + 对象存储（**当前版本未实现 UI**）

---

## 九、快速验证清单

- [ ] MySQL 已执行 `alter_t_exam_proctor.sql`
- [ ] `docker compose -f docker-compose.livekit.yml ps` 为 running
- [ ] 后端 `livekit.*` 与 LiveKit 密钥一致
- [ ] 前端已 `npm install`
- [ ] 教师创建考试并 **启用摄像头监考**
- [ ] 学生进入答题页，摄像头小窗正常
- [ ] 教师 **考试管理 → 监考** 能看到考生与画面
- [ ] 故意遮挡摄像头 / 离屏，教师端出现告警

---

## 十、相关文件索引

| 文件 | 说明 |
|------|------|
| `docker-compose.livekit.yml` | LiveKit 开发容器 |
| `online-exam-system-backend/sql/alter_t_exam_proctor.sql` | 数据库脚本 |
| `online-exam-system-backend/.../ProctorController.java` | 监考 API |
| `online-exam-system-frontend/src/components/ExamProctorStudent/` | 学生监考组件 |
| `online-exam-system-frontend/src/views/exam/proctor/` | 教师监考页 |
| `online-exam-system-frontend/src/api/proctor.js` | 前端 API 封装 |
| `online-exam-system-frontend/src/utils/proctorFaceDetect.js` | MediaPipe 人脸检测 |

---

*文档版本：与 feature/ai-integration 监考 MVP 同步*
