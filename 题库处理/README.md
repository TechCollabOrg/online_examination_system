# 题库 Word 转导入 Excel

这个小工具用于把 `.docx/.doc` 里的题目，转换成系统支持的“导入试题模板”同结构的 `.xlsx`，用于后续在后台批量导入题库。

## 你需要准备什么

- Windows 电脑
- **Python 3.10+**（能运行 `python` 命令）
- 依赖库（第一次运行安装一次）
- 如果你要处理 `.doc`（不是 `.docx`），推荐安装 **LibreOffice**（用于把 `.doc` 先转成 `.docx`）

案例分析类 Word 常用 **`[问题1]`**（半角方括号）或 **`【问题1】`** 作为小题标题，脚本两种都会识别；大题分界支持 **`试题一`**、**`题目1、…`** 等。

**材料题 / 多小问（一整道不拆散）**：若识别到 `【问题N】` / `[问题N]` 结构，脚本会把**同一道大题**下的多个小问写成 Excel 里**相同的「材料组编号」**；**仅本组第一行**填写「共用材料题干」（`题目…` / `试题…` 与首个【问题】之间的正文会并入材料），**每一小问单独一行**，题型可为单选/多选/判断/简答，**每行自带 A～F 选项与是否正确列**（与后台 `questions/import` 行为一致；导入后自动建的父题为 **题型 5「共用材料」**，不是简答题）。若 Word 里没有单独「大题说明」段落，第一行共用材料可能为占位句，导入后可在题库里编辑父题补全。

## 一键运行（复制就能用）

在项目根目录打开 PowerShell，运行：

```powershell
cd .\题库处理
python -m pip install -r .\requirements.txt

# 把你的一批 Word 文件（或文件夹）转换为 Excel（按“每套卷子”分别生成一个 .xlsx）
python .\convert_word_to_import_xlsx.py --per-paper --out-dir D:\题库\out `
  "D:\题库\01中级软件设计师下午试题模拟+答案详解.doc" `
  "D:\题库\2021年11月系统架构师真题（案例分析）.docx" `
  "D:\题库\2021年11月系统架构师真题（论文）.docx"
```

使用你本机的导题模板（须与系统列结构一致）：

```powershell
python .\convert_word_to_import_xlsx.py --per-paper --template "D:\导入试题模板.xlsx" --out-dir D:\题库\out\batch-import `
  --minio-endpoint "http://你的MinIO地址:9000" --minio-access-key admin --minio-secret-key 你的密码 --minio-bucket online-exam `
  "D:\题库\试卷1.docx" "D:\题库\试卷2.docx"
```

**说明**：`--minio-endpoint` 必须填当前电脑能访问到的 MinIO API 地址；大卷子上传图片较多时耗时会较长，可用 `python -u .\convert_word_to_import_xlsx.py ...` 让日志实时打印。

若 MinIO **连不上或超时**，脚本仍会**正常生成 `.xlsx`**，图片列会保留为**本机导出的文件路径**（不会整卷失败、不会出现“一个 xlsx 都没有”的情况）。网络恢复后可只重传图片或改 endpoint 再跑一次。

运行成功后会在你指定的输出目录生成类似 `导入题目-20260508-102233.xlsx` 的文件。

## 图片会怎么处理？

脚本会按 **正文 + 表格（含嵌套表）** 在 Word 中的顺序遍历段落，把能识别的 **drawing 图片** 导出到：

- `D:\题库\out\assets\<卷子文件名>\img_0001.png`（示例）

然后在模板里写入链接（**只写链接，不把图片贴进单元格**）：

- **题干 / 选项**：第 **16～22** 列（`题干图片`、`选项A~F图片`）。同一行选项文字里夹带的图，归该选项。
- **答案区 / 解析区**：模板没有单独列 → 链接写在 **第 9 列「解析」** 文本里，前面分别加 **`答案附图：`**、**`解析附图：`**（与「答案：」「解析正文」分段用换行拼接）。这些图 **同样会上传 MinIO**（若已配置）。

若某份 Word 里的图是 **嵌入对象 / 部分旧版 WMF** 等，`python-docx` 仍可能抽不到。

## 答案与解析（第 9 列「解析」）

脚本会把能识别到的**文字答案**与**解析**写入模板第 9 列（多段用换行拼接）：

- **简答题**：`答案：…`（若有）+ `解析内容`
- **选择题 / 判断题**：除选项列的“是否正确”外，也会在解析列写入 `答案：A`（或 `答案：A、C`）便于核对；若 Word 里另有「解析」段落，会接在后面。

## 直接上传到 MinIO（推荐）

如果你不想用本地路径链接（比如要在服务器上导入），可以让脚本把图片**自动上传到 MinIO**，并把 Excel 里的图片列改成 MinIO 链接。

> **重要**：脚本会上传「题干 / 选项 / 答案附图 / 解析附图」所绑定的图片；未绑定到题目的零散图不会上传。

### 方式 A：用环境变量（跟后端同名，最省事）

在 PowerShell 里先设置（只对当前窗口生效）：

```powershell
$env:MINIO_ENDPOINT="http://127.0.0.1:9000"
$env:MINIO_ACCESS_KEY="admin"
$env:MINIO_SECRET_KEY="changeme"
$env:MINIO_BUCKET="online-exam"
```

然后运行转换：

```powershell
python .\convert_word_to_import_xlsx.py --per-paper --out-dir D:\题库\out `
  --minio-endpoint $env:MINIO_ENDPOINT `
  --minio-access-key $env:MINIO_ACCESS_KEY `
  --minio-secret-key $env:MINIO_SECRET_KEY `
  --minio-bucket $env:MINIO_BUCKET `
  "D:\题库\2026jzz组内测试试题一.docx"
```

### 方式 B：私有桶用“临时链接”（presign）

如果你的桶不是公开读的，建议加：

- `--minio-presign-seconds 604800`（7 天有效期）

## 我想“必须确认能正确导入”，怎么检查？

你可以加上 `--strict`（严格模式）。脚本会做一些“明显会导入失败”的检查，例如：

- 选择题缺少 A/B 选项
- 选择题没有识别到正确答案

一旦发现这些问题会：

- 仍然生成 Excel（方便你检查）
- 同时生成一份 `转换报告-xxxx.txt`
- 并且脚本返回非 0（表示这批数据不够“稳”，需要修规则或手工补齐）

## 常见问题

### 1）`.doc` 报错 “未检测到 LibreOffice（soffice）”

说明你电脑没有安装 LibreOffice 或没有把 `soffice` 加到 PATH。

解决方式：
- 安装 LibreOffice（默认安装就行）
- 重新打开终端再运行一次命令

如果你不想装 LibreOffice，也可以先把 `.doc` 手动另存为 `.docx` 再转换。

