const fs = require('fs');

const envPath = process.argv[2];
const enabled = process.argv[3];
if (!envPath || !['true', 'false'].includes(enabled)) {
  throw new Error('usage: node set-wecom-enabled.js <env-file> <true|false>');
}

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
let found = false;
const output = lines.map((line) => {
  if (!line.startsWith('WECOM_ROUTER_ENABLED=')) return line;
  found = true;
  return `WECOM_ROUTER_ENABLED=${enabled}`;
});
if (!found) output.push(`WECOM_ROUTER_ENABLED=${enabled}`);
fs.writeFileSync(envPath, `${output.filter((line, index, array) => line || index < array.length - 1).join('\n')}\n`, {
  encoding: 'utf8',
  mode: 0o600
});
console.log(`wecom_router_enabled=${enabled}`);

