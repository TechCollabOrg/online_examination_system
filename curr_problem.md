# 目前发现设计问题及运行中出现 bug

1. 导入功能不能完全正常运行：模板 Excel 可导入，但 **AI 生成的 JSON** 若不符合规范会失败（常见报错：值为 null）。规范见 `online-exam-system-backend/sql/JSON_QUESTION_IMPORT_SPEC.md`。

2. 目前网页端考试无法全屏

3. 桌面软件其它 IP 无法访问后端服务器

4. 进入「考试管理」->「考试详情」会报错（见下图）

![image-20260508110858972](curr_problem.assets/image-20260508110858972.png)

---

# 本次开发记录（2026-05，分支 `feature/ai-integration`）

> 项目备忘；`curr_problem.md` 随功能更新一并提交主仓库。

## 环境与启动

| 项 | 说明 |
|----|------|
| **密钥文件（开发兜底）** | `online-exam-system-backend/env.local`（已 gitignore），参考 `env.local.example` |
| **硅基流动（env 兜底）** | `CHAT_PLATFORM_TYPE=llm`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` |
| **管理员 API 配置（推荐）** | 侧边栏「API 连接配置」，写入库表后全站 AI 功能共用，**优先于 env.local** |
| **一键启动** | 内层仓库根目录：`.\start-all.ps1` 或 `start-all.bat` |
| **停止服务** | `.\stop-all.ps1` |
| **改代码后** | 再次 `.\start-all.ps1`；仅改配置用 `-Restart` |

## 管理员 API 连接配置（2026-05 新增）

| 项 | 说明 |
|----|------|
| **入口** | 管理员登录 → 侧边栏 **「API 连接配置」**（`/ai-api-config`，仅 `admin`） |
| **能力** | OpenAI 兼容：填 **基础 URL** + **API 密钥** → **测试连接**（`GET {baseUrl}/models`）→ 下拉 **选择模型** → **保存并启用**；支持 **发送测试消息** |
| **数据库** | 首次部署执行 `online-exam-system-backend/sql/alter_t_ai_platform_config.sql`（表 `t_ai_platform_config`，单例 id=1） |
| **后端接口** | `GET/PUT /api/ai/config`；`POST .../test-connection`、`.../models`、`.../test-chat`（管理员）；`GET .../status`（各角色，不含密钥） |
| **运行时** | `AIChatRouter` 优先读库内已启用配置；未启用时回退 `env.local` / yml（coze、dify、llm） |
| **使用范围** | 保存并启用后：教师/学生的 **AI 助手**、**AI 阅卷**、**成绩简报** 等均走同一套接口 |
| **密钥** | 接口返回脱敏（`apiKeySet`）；保存时密钥留空表示不修改原密钥 |
| **已知 UI** | 测试连接后不再调用 `loadConfig()` 覆盖未保存的表单（已修复） |

### 配置步骤（管理员）

1. 执行 SQL 脚本建表  
2. 填写基础 URL（如 `https://api.siliconflow.cn/v1`）与 API Key  
3. **测试连接** → 选择模型 → 打开 **启用** → **保存配置**  
4. 可选：发送测试消息验证对话  

## AI 助手（对话 + RAG + Markdown，2026-05）

| 项 | 说明 |
|----|------|
| **入口** | 侧边栏 **「AI 助手」**（学生 / 教师 / 管理员） |
| **界面** | 多轮气泡对话；`Enter` 发送、`Shift+Enter` 换行；AI 回复 **Markdown 渲染**（`marked` + `DOMPurify`） |
| **RAG 知识库** | `backend/src/main/resources/ai-knowledge/*.md`（系统概览、各角色操作说明） |
| **检索方式** | 启动时加载 Markdown 切片，按关键词匹配 top 片段；**不连接题库库表** |
| **多轮** | `POST /api/ai/chat` 支持 `history`；专用 `buildAssistantSystemMessage` |
| **依赖** | 前端 `marked`、`dompurify`；须管理员 **保存并启用** API 配置 |

## JSON 试题导入

| 问题 | 原因 | 处理 |
|------|------|------|
| 前端选不了 JSON | `accept` 仅 `.xls/.xlsx` | 已支持 `.json` |
| `Unknown column 'analysis'` | 旧库缺列 | 执行 `sql/alter_t_option_analysis.sql` 等 |
| AI 生成 JSON 导入失败 | 缺 `quType`、`isRight` 为 null、结构不符 | 严格按 `JSON_QUESTION_IMPORT_SPEC.md` 生成 |

## AI 功能一览

| 功能 | 入口 | 后端要点 | 前端 |
|------|------|----------|------|
| **API 连接配置** | 管理员侧边栏 | `AiConfigController`、`AIChatRouter`、`LlmChatExecutor` | `views/ai-config/index.vue` |
| **AI 助手** | AI 对话页 | `AiChatServiceImpl` + `AiKnowledgeRagService` + `POST /api/ai/chat` | `ai-assistant/index.vue`、`MarkdownView`（未配置时提示；对话 **sessionStorage** 暂存） |
| **AI 主观题阅卷** | 阅卷页「AI 阅卷」；交卷后自动 | `AutoScoringServiceImpl`、`POST /api/answers/ai-score` | `makeTest.vue` |
| **成绩分析 AI 简报** | 成绩详情「生成简报」 | `GET /api/score/ai-briefing` | `score/detail.vue`（简报 **Markdown**；**sessionStorage** 暂存） |

### AI 阅卷说明

- 仅 **顶层简答题**（`qu_type=4`）参与；复合题子简答暂未纳入。
- `ai_score` / `ai_reason` 为建议分；教师「提交批改」后为正式成绩。
- 可选联网：`AI_GRADING_WEB_SEARCH=true` + `SERPER_API_KEY`。

## 仓库与远端

| 仓库 | 分支 | 说明 |
|------|------|------|
| online-exam-system-backend | `feature/ai-integration` | 含 API 配置、阅卷、简报等 |
| online-exam-system-frontend | `feature/ai-integration` | 含 API 配置页、AI 助手等 |
| online_examination_system | `main` | 子模块指针 + `curr_problem.md` |

远程：`TechCollabOrg/online-exam-system-backend`、`online-exam-system-frontend`、`online_examination_system`。

## 成绩分析页与前端状态保持（2026-05）

### 遇见的问题

| 现象 | 原因 |
|------|------|
| 顶部标签切换报 `Failed to convert ... Integer ... For input string: "null"` | 曾用 `localStorage` 存 `examId`，值为 `null` 时变成字符串 `"null"` 传给后端；切标签时 ID 丢失或带脏 query |
| 生成 AI 简报后切走再回来内容没了 | 组件销毁后内存状态丢失，未做会话级缓存 |
| AI 助手对话切页后丢失 | 同上 |
| 简报生成失败或统计 SQL 异常 | `ExamQuAnswerMapper.xml` 中误写 `case where`（应为 `case when`） |
| 仅配 `env.local` 未配管理员 API 时简报仍失败 | 简报服务未统一走库内「API 连接配置」校验 |

### 解决方案

| 项 | 处理 |
|----|------|
| **成绩详情路由** | 「查看详情」带 `query.examId/gradeId`，并用 `sessionStorage`（`pagePersist.js`）保存考试/班级上下文；`parsePositiveInt` 过滤 `"null"` |
| **标签切换** | 不再在 `beforeDestroy` 删除 `examId`；进入详情时自动修正 URL 中的 `examId=null` |
| **AI 简报** | 生成后写入 `sessionStorage`（键 `ai_briefing_{examId}_{gradeId}`）；正文用 `MarkdownView` 渲染 |
| **AI 助手** | 按用户 ID 将对话存入 `sessionStorage`（最多 50 条），清空对话时同步删除 |
| **后端 SQL** | `questionAnalyse`：`case when is_right = 1` |
| **后端简报** | 生成前检查管理员 API 是否启用；错误提示指向「API 连接配置」 |
| **Redis 本地启动** | `env.local.example` 注明：本机 Redis 无密码时 `REDIS_PASSWORD` 留空，否则 `ERR AUTH` |
| **简报永久入库** | 曾设计 `t_score_ai_briefing` 表，后决定不做；已撤回，仍用 sessionStorage（关标签即清空） |

### 相关文件

- 前端：`src/utils/pagePersist.js`、`views/score/index.vue`、`views/score/detail.vue`、`views/ai-assistant/index.vue`
- 后端：`ExamQuAnswerMapper.xml`、`ScoreAiBriefingServiceImpl.java`

## 仍待处理

- 网页端考试全屏
- 桌面端其它 IP 访问后端
- 考试管理 → 考试详情报错（见上文截图）
- 复合题简答子题纳入 AI 阅卷
