/**
 * Post-merge smoke test: login as admin/teacher/student and hit key APIs.
 * Usage: node scripts/smoke-test.mjs
 */
import CryptoJS from '../online-exam-system-frontend/node_modules/crypto-js/index.js'
import net from 'net'

const BASE = 'http://127.0.0.1:8080/api'
const KEY = CryptoJS.enc.Utf8.parse('changeme16byte!!')
const IV = CryptoJS.enc.Utf8.parse('changeme16byte!!')

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
  const verify = await api('/auths/verifyCode', {
    method: 'POST',
    body: { code, captchaId }
  })
  if (verify.json.code !== 1) throw new Error(`verifyCode failed: ${JSON.stringify(verify.json)}`)
  const login = await api('/auths/login', {
    method: 'POST',
    body: { username, password: encrypt(password), captchaId }
  })
  if (login.json.code !== 1) throw new Error(`login ${username} failed: ${JSON.stringify(login.json)}`)
  return login.json.data
}

function assertOk(name, res) {
  if (res.json.code !== 1) {
    throw new Error(`${name} failed (${res.status}): ${JSON.stringify(res.json)}`)
  }
  console.log(`  OK ${name}`)
}

async function main() {
  console.log('=== Smoke test ===')
  const doc = await fetch('http://127.0.0.1:8080/doc.html')
  if (!doc.ok) throw new Error('doc.html not reachable')
  console.log('OK backend doc.html')

  const roles = [
    { user: 'admin', pass: '123456', checks: [
      ['/user/paging?pageNum=1&pageSize=5', 'admin user paging'],
      ['/exams/paging?pageNum=1&pageSize=5', 'admin exam paging']
    ]},
    { user: 'teacher', pass: '123456', checks: [
      ['/repo/paging?pageNum=1&pageSize=5', 'teacher repo paging'],
      ['/questions/paging?pageNum=1&pageSize=5', 'teacher question paging'],
      ['/exams/paging?pageNum=1&pageSize=5', 'teacher exam paging']
    ]},
    { user: 'student', pass: '123456', checks: [
      ['/exams/grade?pageNum=1&pageSize=5', 'student exam list'],
      ['/records/exam/paging?pageNum=1&pageSize=5', 'student exam records']
    ]}
  ]

  for (const role of roles) {
    console.log(`\n-- ${role.user} --`)
    const token = await loginAs(role.user, role.pass)
    const info = await api('/user/info', { token })
    assertOk(`${role.user} info`, info)
    for (const [path, label] of role.checks) {
      assertOk(label, await api(path, { token }))
    }
  }

  console.log('\n=== All smoke tests passed ===')
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
