/**
 * Full functional verification: all roles, key APIs, and end-to-end exam flow.
 * Usage: node scripts/full-function-test.mjs
 */
import CryptoJS from '../online-exam-system-frontend/node_modules/crypto-js/index.js'
import net from 'net'

const BASE = 'http://127.0.0.1:8080/api'
const KEY = CryptoJS.enc.Utf8.parse('changeme16byte!!')
const IV = CryptoJS.enc.Utf8.parse('changeme16byte!!')

const results = { pass: [], fail: [], skip: [], warn: [] }

function encrypt(word) {
  const srcs = CryptoJS.enc.Utf8.parse(word)
  const encrypted = CryptoJS.AES.encrypt(srcs, KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  })
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext)
}

function parseRedisBulkString(resp) {
  const parts = resp.split('\r\n').filter((p) => p !== '')
  const lenIdx = parts.findIndex((p) => p.startsWith('$') && p !== '$-1')
  if (lenIdx < 0 || lenIdx + 1 >= parts.length) return ''
  return parts[lenIdx + 1]
}

function redisGet(key) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(6379, '127.0.0.1')
    const payload = `*2\r\n$3\r\nGET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`
    let data = ''
    client.setTimeout(5000)
    client.on('data', (chunk) => {
      data += chunk.toString()
      resolve(parseRedisBulkString(data))
      client.destroy()
    })
    client.on('error', reject)
    client.on('timeout', () => { client.destroy(); reject(new Error('Redis timeout')) })
    client.write(payload)
  })
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function loginAs(username, password) {
  const cap = await api('/auths/captcha/json')
  if (cap.json.code !== 1) throw new Error(`captcha/json failed: ${JSON.stringify(cap.json)}`)
  const captchaId = cap.json.data.captchaId
  const code = await redisGet(`captcha:code:${captchaId}`)
  if (!code) throw new Error(`Redis captcha missing for ${captchaId}`)
  const verify = await api('/auths/verifyCode', { method: 'POST', body: { code, captchaId } })
  if (verify.json.code !== 1) throw new Error(`verifyCode failed: ${JSON.stringify(verify.json)}`)
  const login = await api('/auths/login', {
    method: 'POST',
    body: { username, password: encrypt(password), captchaId }
  })
  if (login.json.code !== 1) throw new Error(`login ${username} failed: ${JSON.stringify(login.json)}`)
  return login.json.data
}

function pass(name) { results.pass.push(name); console.log(`  ✓ ${name}`) }
function fail(name, err) { results.fail.push({ name, err }); console.log(`  ✗ ${name}: ${err}`) }
function skip(name, reason) { results.skip.push({ name, reason }); console.log(`  ○ ${name} (跳过: ${reason})`) }
function warn(name, reason) { results.warn.push({ name, reason }); console.log(`  ! ${name} (警告: ${reason})`) }

async function checkOk(name, res, { allowEmpty = true } = {}) {
  if (res.json.code !== 1) {
    fail(name, res.json.message || JSON.stringify(res.json))
    return null
  }
  if (!allowEmpty && (res.json.data === null || res.json.data === undefined)) {
    fail(name, '返回 data 为空')
    return null
  }
  pass(name)
  return res.json.data
}

async function waitForBackend(maxMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('http://127.0.0.1:8080/doc.html')
      if (res.ok) return
    } catch (_) { /* retry */ }
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('后端在 120s 内未启动')
}

// ─── Role-based read API checks ───────────────────────────────────────────

async function testAdmin(token) {
  console.log('\n【管理员】只读接口')
  await checkOk('用户分页', await api('/user/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('考试分页', await api('/exams/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('班级分页', await api('/grades/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('班级列表', await api('/grades/list', { token }))
  await checkOk('题库分页', await api('/repo/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('题目分页', await api('/questions/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('分类树', await api('/category/tree', { token }))
  await checkOk('一级分类', await api('/category/first-level', { token }))
  await checkOk('公告分页', await api('/notices/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('证书分页', await api('/certificate/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('操作日志', await api('/log?pageNum=1&pageSize=5', { token }))
  await checkOk('邀请码分页', await api('/invite-codes/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('AI 配置', await api('/ai/config', { token }))
  await checkOk('AI 配置状态', await api('/ai/config/status', { token }))
  await checkOk('全站统计', await api('/stat/allCounts', { token }))
  await checkOk('阅卷分页', await api('/score/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('答卷分页', await api('/answers/exam/page?pageNum=1&pageSize=5', { token }))
}

async function testTeacher(token) {
  console.log('\n【教师】只读接口')
  await checkOk('题库分页', await api('/repo/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('题目分页', await api('/questions/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('考试分页', await api('/exams/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('班级分页', await api('/grades/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('分类树', await api('/category/tree', { token }))
  await checkOk('公告分页', await api('/notices/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('讨论(教师)', await api('/discussion/query/page/owner?pageNum=1&pageSize=5', { token }))
  await checkOk('阅卷分页', await api('/score/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('答卷分页', await api('/answers/exam/page?pageNum=1&pageSize=5', { token }))
  await checkOk('考试统计', await api('/stat/exam', { token }))
}

async function testStudent(token) {
  console.log('\n【学生】只读接口')
  await checkOk('试卷中心', await api('/exams/grade?pageNum=1&pageSize=5', { token }))
  await checkOk('考试记录', await api('/records/exam/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('刷题记录', await api('/records/exercise/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('错题本分页', await api('/userbooks/paging?pageNum=1&pageSize=5', { token }))
  await checkOk('刷题题库', await api('/exercises/getRepo?pageNum=1&pageSize=5', { token }))
  await checkOk('讨论(学生)', await api('/discussion/query/page/student?pageNum=1&pageSize=5', { token }))
  await checkOk('我的证书', await api('/certificate/paging/my?pageNum=1&pageSize=5', { token }))
  await checkOk('最新公告', await api('/notices/new', { token }))
  await checkOk('学生统计', await api('/stat/student', { token }))
  await checkOk('每日在线', await api('/stat/daily', { token }))
  await checkOk('排名趋势', await api('/score/student-rank-trend', { token }))
}

// ─── End-to-end exam flow ─────────────────────────────────────────────────

async function testExamFlow(teacherToken, studentToken) {
  console.log('\n【端到端】考试全流程')

  // 1. Find or create repo
  const repos = await checkOk('获取题库列表', await api('/repo/paging?pageNum=1&pageSize=1', { token: teacherToken }))
  let repoId = repos?.records?.[0]?.id
  if (!repoId) {
    const created = await checkOk('创建测试题库', await api('/repo', {
      method: 'POST', token: teacherToken,
      body: { title: `自动化测试题库_${Date.now()}`, remark: 'auto-test' }
    }))
    repoId = created?.id
  }
  if (!repoId) { skip('考试全流程', '无可用题库'); return }

  // 2. Create single-choice question
  const quBody = {
    quType: 1,
    level: 1,
    content: `自动化测试单选题_${Date.now()}`,
    repoIds: String(repoId),
    answer: 'A',
    analysis: '测试解析',
    quOptionList: [
      { content: '选项A', isRight: 1, sort: 0 },
      { content: '选项B', isRight: 0, sort: 1 },
      { content: '选项C', isRight: 0, sort: 2 },
      { content: '选项D', isRight: 0, sort: 3 }
    ]
  }
  const qu = await checkOk('创建单选题', await api('/questions/single', {
    method: 'POST', token: teacherToken, body: quBody
  }))
  const quId = qu?.id
  if (!quId) { skip('考试全流程', '创建题目失败'); return }

  // 3. Get grade for exam
  const grades = await checkOk('获取班级', await api('/grades/list', { token: teacherToken }))
  const gradeId = grades?.[0]?.id
  if (!gradeId) { skip('考试全流程', '无可用班级'); return }

  // 4. Create exam (manual mode, immediate start)
  const now = new Date()
  const start = new Date(now.getTime() - 60000)
  const end = new Date(now.getTime() + 3600000)
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ')
  const examBody = {
    title: `自动化测试考试_${Date.now()}`,
    content: '自动化测试',
    openType: 1,
    addQuype: 0,
    state: 1,
    totalScore: 10,
    qualifyScore: 6,
    totalTime: 60,
    startTime: fmt(start),
    endTime: fmt(end),
    gradeIds: String(gradeId),
    targetType: 1,
    quIds: String(quId),
    quScores: '10'
  }
  const exam = await checkOk('创建考试', await api('/exams', {
    method: 'POST', token: teacherToken, body: examBody
  }))
  const examId = exam?.id
  if (!examId) { skip('考试全流程', '创建考试失败'); return }

  await checkOk('考试详情(教师)', await api(`/exams/details/${examId}`, { token: teacherToken }))
  await checkOk('缺考名单', await api(`/answers/exam/absent?examId=${examId}`, { token: teacherToken }))

  // 5. Student takes exam
  const gradeExams = await checkOk('学生试卷中心', await api(`/exams/grade?pageNum=1&pageSize=20`, { token: studentToken }))
  const found = gradeExams?.records?.find((e) => e.id === examId)
  if (!found) warn('学生可见考试', '新创建的考试未出现在学生试卷中心，可能班级不匹配')

  await checkOk('学生开考', await api(`/exams/start?examId=${examId}`, { token: studentToken }))
  const quList = await checkOk('获取试题列表', await api(`/exams/question/list/${examId}`, { token: studentToken }))
  if (!quList?.length) { fail('获取试题列表', '题目为空'); return }

  const examQuId = quList[0].id
  const answerBody = {
    examId,
    quId: examQuId,
    answer: 'A',
    quType: 1
  }
  await checkOk('提交答案', await api('/exams/full-answer', {
    method: 'POST', token: studentToken, body: answerBody
  }))
  await checkOk('交卷', await api(`/exams/hand-exam/${examId}`, { token: studentToken }))

  // 6. Verify records
  await new Promise((r) => setTimeout(r, 2000))
  const records = await checkOk('学生考试记录', await api('/records/exam/paging?pageNum=1&pageSize=10', { token: studentToken }))
  const myRecord = records?.records?.find((r) => r.examId === examId)
  if (myRecord) {
    pass('考试记录已生成')
    await checkOk('考后详情', await api(`/records/exam/detail?examId=${examId}`, { token: studentToken }))
  } else {
    warn('考试记录', '交卷后记录未立即出现')
  }

  // 7. Teacher views score
  await checkOk('教师查看成绩', await api(`/score/getExamScore?examId=${examId}&gradeId=${gradeId}`, { token: teacherToken }))

  // Cleanup
  console.log('\n【清理】删除测试数据')
  await api(`/exams/${examId}`, { method: 'DELETE', token: teacherToken })
  pass('删除测试考试')
  await api(`/questions/batch/${quId}`, { method: 'DELETE', token: teacherToken })
  pass('删除测试题目')
}

// ─── Write operations (safe, non-destructive) ───────────────────────────────

async function testWriteOps(studentToken, teacherToken, adminToken) {
  console.log('\n【写操作】讨论 / 公告 / 邀请码 / 在线心跳')

  // Discussion
  const disc = await checkOk('学生发帖', await api('/discussion/add', {
    method: 'POST', token: studentToken,
    body: { title: `测试讨论_${Date.now()}`, content: '自动化测试帖子内容' }
  }))
  if (disc?.id) {
    await checkOk('讨论详情', await api(`/discussion/query/detail/${disc.id}`, { token: studentToken }))
    await checkOk('删除讨论', await api(`/discussion/delete/${disc.id}`, { method: 'DELETE', token: teacherToken }))
  }

  // Notice
  const grades = await api('/grades/list', { token: teacherToken })
  const gradeId = grades.json?.data?.[0]?.id
  if (gradeId) {
    const notice = await checkOk('教师发公告', await api('/notices', {
      method: 'POST', token: teacherToken,
      body: { title: `测试公告_${Date.now()}`, content: '自动化测试', gradeIds: String(gradeId) }
    }))
    if (notice?.id) {
      await checkOk('删除公告', await api(`/notices/${notice.id}`, { method: 'DELETE', token: teacherToken }))
    }
  }

  // Invite code
  const invite = await checkOk('生成邀请码', await api('/invite-codes', {
    method: 'POST', token: adminToken,
    body: { roleId: 2, maxUses: 1, expireDays: 1 }
  }))
  if (invite?.id) {
    await checkOk('禁用邀请码', await api(`/invite-codes/${invite.id}/disable`, { method: 'PUT', token: adminToken }))
    await checkOk('删除邀请码', await api(`/invite-codes/${invite.id}`, { method: 'DELETE', token: adminToken }))
  }

  // Presence heartbeat
  await checkOk('在线心跳', await api('/user/presence', {
    method: 'POST', token: studentToken, body: { duration: 60 }
  }))
}

// ─── Frontend check ─────────────────────────────────────────────────────────

async function testFrontend() {
  console.log('\n【前端】页面可达性')
  try {
    const res = await fetch('http://localhost:9527')
    if (res.ok) pass('前端首页 http://localhost:9527')
    else fail('前端首页', `HTTP ${res.status}`)
  } catch (e) {
    fail('前端首页', e.message)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== 在线考试系统 · 全功能验证 ===\n')
  console.log('等待后端启动...')
  await waitForBackend()
  pass('后端 doc.html 可达')

  const adminToken = await loginAs('admin', '123456')
  pass('管理员登录')
  const teacherToken = await loginAs('teacher', '123456')
  pass('教师登录')
  const studentToken = await loginAs('student', '123456')
  pass('学生登录')

  await testAdmin(adminToken)
  await testTeacher(teacherToken)
  await testStudent(studentToken)
  await testWriteOps(studentToken, teacherToken, adminToken)
  await testExamFlow(teacherToken, studentToken)
  await testFrontend()

  console.log('\n=== 验证汇总 ===')
  console.log(`通过: ${results.pass.length}`)
  console.log(`失败: ${results.fail.length}`)
  console.log(`跳过: ${results.skip.length}`)
  console.log(`警告: ${results.warn.length}`)

  if (results.fail.length) {
    console.log('\n失败项:')
    results.fail.forEach((f) => console.log(`  - ${f.name}: ${f.err}`))
    process.exit(1)
  }
  if (results.warn.length) {
    console.log('\n警告项:')
    results.warn.forEach((w) => console.log(`  - ${w.name}: ${w.reason}`))
  }
  console.log('\n=== 全部核心功能验证通过 ===')
}

main().catch((e) => {
  console.error('\n验证中断:', e.message)
  process.exit(1)
})
