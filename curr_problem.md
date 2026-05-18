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
| **AI 助手** | AI 对话页 | `POST /api/ai/chat` | `ai-assistant/index.vue`（未配置时提示） |
| **AI 主观题阅卷** | 阅卷页「AI 阅卷」；交卷后自动 | `AutoScoringServiceImpl`、`POST /api/answers/ai-score` | `makeTest.vue` |
| **成绩分析 AI 简报** | 成绩详情「生成简报」 | `GET /api/score/ai-briefing` | `score/detail.vue` |

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

## 仍待处理

- 网页端考试全屏
- 桌面端其它 IP 访问后端
- 考试管理 → 考试详情报错（见上文截图）
- 复合题简答子题纳入 AI 阅卷
