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

| **RAG 知识库** | 管理员 **「AI 知识库」**（`/ai-knowledge`）增删改；存表 `t_ai_knowledge_doc`；首次空库启动或点「导入内置」可写入 `resources/ai-knowledge/*.md` |

| **检索方式** | 从数据库加载已启用文档并切片，按关键词匹配 top 片段；**不连接题库库表**；增删改后自动刷新索引 |

| **SQL** | `online-exam-system-backend/sql/create_t_ai_knowledge_doc.sql` |

| **接口** | `GET/POST/PUT/DELETE /api/ai/knowledge`；`POST .../import-builtin`（仅管理员）；增删改后服务端自动刷新索引 |

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

| **AI 知识库** | 管理员侧边栏 | `AiKnowledgeController`、`AiKnowledgeRagServiceImpl`（DB 加载） | `views/ai-knowledge/index.vue` |

| **AI 助手** | AI 对话页 | `AiChatServiceImpl` + `AiKnowledgeRagService` + `POST /api/ai/chat` | `ai-assistant/index.vue`、`MarkdownView`（未配置时提示；对话 **sessionStorage** 暂存） |

| **AI 主观题阅卷** | 阅卷页「AI 阅卷」；交卷后后台自动 | `autoScoringExamSync`（手动同步）/ `autoScoringExam`（交卷异步）；`POST /api/answers/ai-score` | `makeTest.vue`（完成后自动填入确认分数） |

| **成绩分析 AI 简报** | 成绩详情「生成简报」 | `GET /api/score/ai-briefing` | `score/detail.vue`（简报 **Markdown**；**sessionStorage** 暂存） |



### AI 阅卷说明

- 仅 **顶层简答题**（`qu_type=4`）参与；复合题简答子题暂未纳入。
- `ai_score` / `ai_reason` 为建议分；教师「提交批改」后为正式成绩。
- 手动点击「AI 阅卷」为 **同步** 执行（接口最长约 180s），完成后前端自动把 `aiScore` 填入「确认分数」，**无需刷新页面**。
- 须管理员在「API 连接配置」中启用 AI；未配置会提示失败。
- 可选联网：`AI_GRADING_WEB_SEARCH=true` + `SERPER_API_KEY`。



## 仓库与远端



| 仓库 | 分支 | 说明 |

|------|------|------|

| online-exam-system-backend | `main` | 含 API 配置、阅卷、简报等 |

| online-exam-system-frontend | `master` | 含 API 配置页、AI 助手等 |

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

## AI 阅卷不可用与体验问题（2026-05）

### 遇见的问题

| 现象 | 原因 |
|------|------|
| 点击「AI 阅卷」后提示刷新，刷新仍无分数 | 后端 `@Async` 异步阅卷，接口立即返回；前端轮询 8 次仍可能拿不到结果 |
| 无法「点完就用」 | 未在接口完成后拉取详情并写入「确认分数」 |
| 分数输入框滚轮误改分 | `type="number"` 的输入框在聚焦时滚轮会改值 |

### 解决方案

| 项 | 处理 |
|----|------|
| **教师手动阅卷** | 新增 `autoScoringExamSync`，`POST /api/answers/ai-score` 同步评完再返回 |
| **交卷自动阅卷** | 保留 `autoScoringExam` 异步，不影响交卷后定时任务 |
| **配置校验** | 同步阅卷前检查管理员「API 连接配置」是否启用 |
| **前端** | 去掉轮询；成功后 `getUserAnswerDetail()` 并将 `aiScore` 填入 `correctScore`；请求超时 600s（题多时每题单独调模型） |
| **分数框** | `@wheel.native.prevent` + 隐藏 number 上下箭头 |

### AI 阅卷只评了部分题（2026-05，feature/ai-integration）

| 现象 | 原因 |
|------|------|
| 点「AI 阅卷」后只有前两题有分数 | 旧版一次请求评多题，模型常只返回 2 条「评分结果」；或 SQL 只查 `qu_type=4` 且缺作答行，漏掉复合题与其它简答 |
| 中途失败则前面已评的也丢失 | 整卷在一个事务里，某一题异常会全部回滚 |

| 项 | 处理 |
|----|------|
| **题目范围** | `AiGradingQuestionLoader` 与教师 `getDetail` 一致：试卷上全部简答题 + 含简答子题的复合题，缺作答行自动补录 |
| **逐题阅卷** | 每题单独调模型、单独事务提交；单题失败不影响其它题 |
| **同步接口** | `POST /api/answers/ai-score` 使用 `autoScoringExamSync`，全部题评完再返回 |

### 相关文件

- 后端：`AutoScoringServiceImpl.java`、`AiGradingQuestionLoader.java`、`IAutoScoringService.java`、`AnswerController.java`
- 前端：`views/answer/makeTest.vue`、`api/answer.js`

## AI 分功能 API 配置（2026-05）

| 项 | 说明 |
|----|------|
| **需求** | AI 阅卷、AI 助手、成绩简报、考后解析等可使用**不同 API/模型**；界面不杂乱 |
| **入口** | 管理员侧栏 → **API 连接配置** |
| **界面** | `el-tabs`：**默认连接**（必填兜底）+ 四个功能 Tab；非默认 Tab 仅一个开关「沿用默认 / 单独配置」，沿用时不展开表单 |
| **默认连接** | 表 `t_ai_platform_config`（id=1）；未单独配置或勾选「沿用默认」的功能均用此处 |
| **分功能表** | `t_ai_feature_config`，编码见下表 |

| 功能 Tab | feature_code | 后端解析 |
|----------|--------------|----------|
| AI 阅卷 | `grading` | `AIChatRouter.getGradingResponse` → `resolveForFeature(GRADING)` |
| AI 助手 | `assistant` | `getAssistantChatResponse` → `ASSISTANT` |
| 成绩简报 | `briefing` | `getBriefingResponse` → `BRIEFING` |
| 考后解析 | `question_review` | `resolveForFeature(QUESTION_REVIEW)`（考后解析服务） |

| **SQL（必做）** | `online-exam-system-backend/sql/alter_t_ai_feature_config.sql` |
| **接口** | `GET /api/ai/config/overview` 总览；`PUT /api/ai/config` 默认；`PUT /api/ai/config/features/{code}` 分功能；`GET /api/ai/config/status?feature=assistant` 各端校验 |

### 相关文件

- 后端：`AiPlatformConfigServiceImpl.java`、`AiFeatureCode.java`、`AiFeatureConfig.java`、`AiConfigController.java`、`AIChatRouter.java`、`sql/alter_t_ai_feature_config.sql`
- 前端：`views/ai-config/index.vue`、`components/AiFeatureConfigPanel/index.vue`、`api/aiConfig.js`

### 验证步骤

1. MySQL 执行 `alter_t_ai_feature_config.sql`，重启后端。
2. 管理员登录 → **API 连接配置** → **默认连接** 填 URL/密钥/模型并启用、保存。
3. 打开 **AI 阅卷** Tab：可保持「沿用默认」，或关闭后填另一套 API 并保存。
4. 教师阅卷页点「AI 阅卷」、学生用 AI 助手、教师生成成绩简报：应分别走对应功能配置（未单独配置则用默认）。

## 学生考后单题 AI 解析（2026-05）

| 项 | 说明 |
|----|------|
| **入口** | 学生（或教师查看答卷）→ **考试记录** → 进入某次考试详情（`record/exam/newk.vue`） |
| **交互** | 每道题下方 **「AI 解析本题」**；`el-dialog` + `append-to-body` 悬浮层，**不改变原页面** |
| **接口** | `POST /api/ai/question-review`（body：`examId`、`quId`、可选 `userId`、`subIndex`） |
| **后端** | `AiQuestionReviewServiceImpl` 拉取答卷明细组 JSON，调用大模型；学生不能解析他人答卷 |
| **展示** | 弹窗内 Markdown 渲染（`MarkdownView`） |
| **前置** | 管理员「API 连接配置」中默认或 **考后解析**（`question_review`）已启用；答卷接口返回 `quId` |

### 相关文件

- 后端：`AiController.java`（`POST /api/ai/question-review`）、`AiQuestionReviewServiceImpl.java`、`AiQuestionReviewForm.java`、`ExamRecordDetailVO.java`（`quId`）、`ExerciseRecordServiceImpl.java`、`Constants.studentQuestionReviewSystemMessage`
- 前端：`views/record/exam/newk.vue`、`components/QuestionAiReviewDialog/index.vue`、`api/ai.js`（`questionAiReview`）

### 验证步骤

1. 管理员在「API 连接配置」保存并启用 AI。
2. 学生登录 → **考试记录** → 进入某次已交卷考试详情。
3. 任意题型题目下方点 **「AI 解析本题」**：应弹出悬浮窗（原页面不跳转），Markdown 展示解析。
4. 学生账号不能对他人答卷（带 `userId` 的教师查看场景由教师身份调用）。

### 需求与分支现状（2026-05-23）

| 现象 | 原因 | 处理 |
|------|------|------|
| 文档写了「AI 解析本题」，页面上找不到 | 考后解析提交在 **后端 `main`（`02f3a51`）**、**前端 `master`（`e4d4b15`）**，曾未合入 `feature/ai-integration` | 将主分支同步进 AI 分支（见下文「分支同步」）；同步后按验证步骤自测 |
| 误以为密码错导致 `start-all` 失败 | 堆栈里是 MyBatis，根因也可能是 **缺表** | 看后端弹窗**最底部** `Caused by`：`Access denied` → 查 `env.local` 的 `MYSQL_PASSWORD`；`Table ... doesn't exist` → 执行对应 `sql/*.sql` |

## AI 知识库管理员维护（2026-05-23）

### 需求背景

| 需求 | 说明 |
|------|------|
| 不要写死 RAG | 原先把说明放在 `classpath:ai-knowledge/*.md`，改文案要重新打包后端 |
| 管理员可维护 | 侧边栏 **「AI 知识库」**（`/ai-knowledge`）增删改 Markdown，供 **AI 助手** 检索 |
| 安全边界 | 知识库只放操作说明，**禁止**写入题库、标准答案、成绩等敏感内容（检索片段也会做关键词过滤） |
| 新增要方便 | 弹窗内支持 **选择本地 `.md/.txt` 导入**（浏览器读文件，UTF-8，≤2MB），不必手贴长文 |
| 不要多余按钮 | 「刷新索引」已去掉：保存/删除/导入后服务端 **自动** `reloadIndex()` |

### 技术实现要点

| 项 | 说明 |
|----|------|
| **表** | `t_ai_knowledge_doc`，脚本 `sql/create_t_ai_knowledge_doc.sql`（**升级必跑**，否则后端启动失败） |
| **RAG 加载** | `AiKnowledgeRagServiceImpl` 从库读 `enabled=1` 文档，按 `##` 分段 + 关键词匹配 |
| **首次数据** | 表为空时启动自动导入内置 md；管理员也可点「导入内置文档」（**仅表为空时**有效，已有数据会提示无需重复导入） |
| **接口** | `GET/POST/PUT/DELETE /api/ai/knowledge`、`POST .../import-builtin`（仅 `role_admin`） |

### 遇见的问题与解决

| 现象 | 类型 | 原因 | 解决 |
|------|------|------|------|
| `start-all.bat` 后端 180s 超时 | 技术 | 缺表 `t_ai_knowledge_doc`，`@PostConstruct` 初始化失败 | 执行 `create_t_ai_knowledge_doc.sql` 后重启 |
| 以为 MySQL 密码不对 | 需求/排错 | `Access denied` 与 `Table doesn't exist` 堆栈相似，都表现为 8080 起不来 | 以日志 **最内层 Caused by** 为准；密码正确仍失败时先查是否缺 SQL |
| 「导入内置文档」点不了 | 需求 | 设计为 **仅空库** 一次性种子；首次启动往往已自动导入 | 日常用「新增文档」或「选择文件导入」；要重置需删光文档后再导入 |
| 找不到「AI 解析本题」 | 需求/分支 | 考后解析在主分支，AI 开发分支未合并 | 见「分支同步」 |

### 相关文件

- 后端：`AiKnowledgeController`、`AiKnowledgeDocServiceImpl`、`AiKnowledgeRagServiceImpl`、`sql/create_t_ai_knowledge_doc.sql`
- 前端：`views/ai-knowledge/index.vue`、`api/aiKnowledge.js`、路由 `/ai-knowledge`

## 一键启动与环境（2026-05-23）

| 项 | 说明 |
|----|------|
| **入口** | 仓库根目录 `start-all.bat` → 调用 `start-all.ps1` |
| **后端窗口** | 标题 `Online Exam Backend :8080`，报错请看此窗口最底部 |
| **依赖** | MySQL（`db_exam`）、Redis（`6379`）；`online-exam-system-backend/env.local` 必填（从 `env.local.example` 复制） |
| **新功能 SQL** | 除 `alter_t_ai_platform_config.sql`、`alter_t_ai_feature_config.sql` 外，知识库需 **`create_t_ai_knowledge_doc.sql`** |

## 分支同步（2026-05-23）

将主分支能力合入 AI 开发分支，避免「文档有、代码无」：

| 仓库 | 主分支 | AI 分支 | 主分支独有（需合入） |
|------|--------|---------|----------------------|
| online-exam-system-backend | `main` | `feature/ai-integration` | 考后单题解析 `02f3a51` 等 |
| online-exam-system-frontend | `master` | `feature/ai-integration` | 考试记录「AI 解析本题」`e4d4b15` 等 |
| online_examination_system | `main` | `main` | 子模块指针 + `curr_problem.md` |

合并后：在 AI 分支上执行上述 SQL → `.\start-all.bat` → 学生进 **考试记录** 详情验证「AI 解析本题」。

## 仍待处理



- 网页端考试全屏

- 桌面端其它 IP 访问后端

- 考试管理 → 考试详情报错（见上文截图）

- 复合题简答子题纳入 AI 阅卷


