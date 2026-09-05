const fs = require('fs');

const envPath = process.argv[2];
const sourceTagId = process.argv[3];
if (!envPath || !sourceTagId) {
  throw new Error('usage: node add-wecom-event-form-rule.js <env-file> <source-tag-id>');
}

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const values = new Map();
for (const line of lines) {
  const index = line.indexOf('=');
  if (index > 0) values.set(line.slice(0, index), line.slice(index + 1));
}
const identity = JSON.parse(values.get('WECOM_IDENTITY_CONFIG_JSON') || '{}');
const eventTagId = identity.event && identity.event.tagId;
if (!eventTagId) throw new Error('event_identity_tag_required');

const state = 'sxf_event_requirement_form';
const existingRules = JSON.parse(values.get('WECOM_CHANNEL_RULES_JSON') || '[]')
  .filter((rule) => rule && rule.state !== state);
existingRules.push({
  state,
  tagIds: [sourceTagId, eventTagId],
  identitySelector: false,
  welcome: {
    text: '您好，欢迎添加赛小蜂赛事顾问。若您刚提交赛事需求，请回复“赛事需求已提交 + 机构或主办方名称”，我们将直接与您沟通后续方案。',
    attachments: [{
      msgtype: 'link',
      link: {
        title: '填写或再次提交赛事需求',
        desc: '填写赛事周期、开赛时间、队伍数量、组别和赛制',
        url: 'https://doc.weixin.qq.com/forms/AFQAGgcoAEYAOMAExRlACACNhvy7EKMff_a#/fill'
      }
    }]
  }
});

const updates = new Map([
  ['WECOM_ROUTER_ENABLED', 'true'],
  ['WECOM_CHANNEL_RULES_JSON', JSON.stringify(existingRules)]
]);
const seen = new Set();
const output = lines.map((line) => {
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
console.log('wecom_event_form_rule_added');
