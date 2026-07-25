const fs = require('fs')

const filePath = process.argv[2]
if (!filePath) {
  throw new Error('Usage: node tools/inspect-cloudbase-json.js <log-file>')
}

const bytes = fs.readFileSync(filePath)
const raw = bytes[0] === 0xff && bytes[1] === 0xfe
  ? bytes.subarray(2).toString('utf16le')
  : bytes.toString('utf8')
const roots = [...raw.matchAll(/^\{\r?\n\s*"data"\s*:/gm)]
const start = roots.length ? roots[roots.length - 1].index : -1
let lastError = null

for (let end = raw.length - 1; end > start; end -= 1) {
  if (raw[end] !== '}') continue
  try {
    const candidate = raw.slice(start, end + 1)
    let inString = false
    let escaped = false
    let repaired = ''
    for (const character of candidate) {
      if (inString) {
        if (escaped) {
          escaped = false
          repaired += character
        } else if (character === '\\') {
          escaped = true
          repaired += character
        } else if (character === '"') {
          inString = false
          repaired += character
        } else if (character === '\r') {
          repaired += '\\r'
        } else if (character === '\n') {
          repaired += '\\n'
        } else if (character === '\t') {
          repaired += '\\t'
        } else {
          repaired += character
        }
      } else {
        if (character === '"') inString = true
        repaired += character
      }
    }
    const payload = JSON.parse(repaired)
    process.stdout.write(JSON.stringify({
      ok: true,
      start,
      end,
      keys: Object.keys(payload),
    }))
    process.exit(0)
  } catch (error) {
    lastError = error
  }
}

process.stdout.write(JSON.stringify({
  ok: false,
  start,
  length: raw.length,
  error: lastError ? lastError.message : 'No closing brace found',
  context: lastError && /position (\d+)/.test(lastError.message)
    ? raw
      .slice(start + Math.max(0, Number(RegExp.$1) - 40), start + Number(RegExp.$1) + 40)
      .replace(/[A-Za-z0-9\u3400-\u9fff]/g, 'x')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
    : undefined,
}))
process.exitCode = 1
