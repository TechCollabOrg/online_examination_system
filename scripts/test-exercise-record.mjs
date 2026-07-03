/**
 * Quick test: submit exercise answer and verify record paging.
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

function redisGet(key) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(6379, '127.0.0.1')
    const payload = `*2\r\n$3\r\nGET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`
    let data = ''
    client.setTimeout(5000)
    client.on('data', (chunk) => {
      data += chunk.toString()
      const parts = data.split('\r\n').filter(Boolean)
      const idx = parts.findIndex((p) => p.startsWith('$') && p !== '$-1')
      resolve(idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : '')
      client.destroy()
    })
    client.on('error', reject)
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
  return res.json()
}

async function main() {
  const cap = await api('/auths/captcha/json')
  if (cap.code !== 1) throw new Error('captcha failed: ' + JSON.stringify(cap))
  const captchaId = cap.data.captchaId
  const code = await redisGet(`captcha:code:${captchaId}`)
  if (!code) throw new Error('no captcha in redis')
  const verify = await api('/auths/verifyCode', { method: 'POST', body: { code, captchaId } })
  if (verify.code !== 1) throw new Error('verify failed: ' + JSON.stringify(verify))
  const login = await api('/auths/login', {
    method: 'POST',
    body: { username: 'student', password: encrypt('123456'), captchaId }
  })
  if (login.code !== 1) throw new Error('login failed: ' + JSON.stringify(login))
  const token = login.data

  const repoId = 99
  const sheet = await api(`/exercises/${repoId}`, { token })
  if (sheet.code !== 1 || !sheet.data?.length) throw new Error('no questions: ' + JSON.stringify(sheet))
  const qu = sheet.data[0]
  const detail = await api(`/exercises/question/${qu.quId}`, { token })
  console.log('detail response:', JSON.stringify(detail))

  const opts = detail.data?.options || []
  const rightOpt = opts.find((o) => o.isRight === 1) || opts[0]
  if (!rightOpt) throw new Error('no options on question')
  const fill = await api('/exercises/fillAnswer', {
    method: 'POST',
    token,
    body: {
      repoId,
      quId: qu.quId,
      answer: String(rightOpt.id),
      quType: detail.data.quType
    }
  })
  console.log('fillAnswer:', fill.code, fill.msg)

  const records = await api('/records/exercise/paging?pageNum=1&pageSize=5', { token })
  console.log('records:', JSON.stringify(records.data))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
