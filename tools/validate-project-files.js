const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const jsonRoots = ['native-dist', 'cloudfunctions']
const standaloneJson = ['cloudbaserc.json', 'project.config.json', 'package.json']
const javascriptRoots = ['native-dist', 'cloudfunctions', 'tools']

function collectFiles(root, extension) {
  const result = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectFiles(entryPath, extension))
    } else if (entry.name.endsWith(extension)) {
      result.push(entryPath)
    }
  }
  return result
}

const jsonFiles = [
  ...jsonRoots.flatMap((root) => collectFiles(path.join(projectRoot, root), '.json')),
  ...standaloneJson.map((file) => path.join(projectRoot, file)),
]
const jsonErrors = []
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    jsonErrors.push({ file, error: error.message })
  }
}

const javascriptFiles = javascriptRoots.flatMap((root) =>
  collectFiles(path.join(projectRoot, root), '.js'),
)
const javascriptErrors = []
for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) {
    javascriptErrors.push({
      file,
      error: (result.stderr || result.stdout).trim(),
    })
  }
}

const summary = {
  jsonChecked: jsonFiles.length,
  jsonErrors,
  javascriptChecked: javascriptFiles.length,
  javascriptErrors,
}
process.stdout.write(JSON.stringify(summary, null, 2))
if (jsonErrors.length || javascriptErrors.length) {
  process.exitCode = 1
}
