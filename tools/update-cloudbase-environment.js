const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const oldEnvId = 'cloudbase-d4g93f0re5f3274c1';
const newEnvId = 'sxf-basketball-d9gp6yt0rd1f7be4d';
const oldCloudPrefix =
  'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/';
const newCloudPrefix =
  'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/';
const textExtensions = new Set(['.js', '.json', '.wxml', '.wxss', '.md']);

function collectFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }
  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') {
      return [];
    }
    return collectFiles(path.join(targetPath, entry.name));
  });
}

const targets = [
  path.join(projectRoot, 'native-dist'),
  path.join(projectRoot, 'cloudfunctions', 'sxSaveAudioLibrary', 'index.js'),
  path.join(projectRoot, 'cloudfunctions', 'README.md'),
  path.join(projectRoot, 'cloudbaserc.json'),
];

let changedFiles = 0;
let replacements = 0;
for (const filePath of targets.flatMap(collectFiles)) {
  if (!textExtensions.has(path.extname(filePath).toLowerCase())) {
    continue;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const oldPrefixCount = original.split(oldCloudPrefix).length - 1;
  let updated = original.replaceAll(oldCloudPrefix, newCloudPrefix);
  const oldEnvCount = updated.split(oldEnvId).length - 1;
  updated = updated.replaceAll(oldEnvId, newEnvId);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    changedFiles += 1;
    replacements += oldPrefixCount + oldEnvCount;
  }
}

console.log(`ChangedFiles=${changedFiles}`);
console.log(`Replacements=${replacements}`);
