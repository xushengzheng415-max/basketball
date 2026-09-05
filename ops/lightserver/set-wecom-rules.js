const fs = require('fs');

const envPath = process.argv[2];
const rawRules = process.argv[3];
if (!envPath || !rawRules) throw new Error('usage: node set-wecom-rules.js <env-file> <rules-json|base64:...>');
const rules = rawRules.startsWith('base64:')
  ? Buffer.from(rawRules.slice('base64:'.length), 'base64').toString('utf8')
  : rawRules;
JSON.parse(rules);

const input = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const updates = new Map([
  ['WECOM_ROUTER_ENABLED', 'true'],
  ['WECOM_CHANNEL_RULES_JSON', rules]
]);
const seen = new Set();
const output = input.map((line) => {
  const index = line.indexOf('=');
  if (index <= 0) return line;
  const key = line.slice(0, index);
  if (!updates.has(key)) return line;
  seen.add(key);
  return `${key}=${updates.get(key)}`;
});
for (const [key, value] of updates) {
  if (!seen.has(key)) output.push(`${key}=${value}`);
}
fs.writeFileSync(envPath, `${output.filter((line, index, array) => line || index < array.length - 1).join('\n')}\n`, {
  encoding: 'utf8',
  mode: 0o600
});

console.log('wecom_rules_updated');
