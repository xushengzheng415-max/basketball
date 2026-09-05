const crypto = require('crypto');
const fs = require('fs');

const envPath = process.argv[2];
const institutionTagId = process.argv[3];
const eventTagId = process.argv[4];
if (!envPath || !institutionTagId || !eventTagId) {
  throw new Error('usage: node configure-wecom-identity-env.js <env-file> <institution-tag-id> <event-tag-id>');
}

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const values = new Map();
for (const line of lines) {
  const index = line.indexOf('=');
  if (index > 0) values.set(line.slice(0, index), line.slice(index + 1));
}

const existingRules = JSON.parse(values.get('WECOM_CHANNEL_RULES_JSON') || '[]');
const currentRule = existingRules[0];
if (!currentRule || !currentRule.state || !currentRule.tagIds || !currentRule.tagIds[0]) {
  throw new Error('existing_channel_rule_required');
}
const attachments = currentRule.welcome && Array.isArray(currentRule.welcome.attachments)
  ? currentRule.welcome.attachments
  : [];
const institutionImageUrl = attachments[0] && attachments[0].image && attachments[0].image.pic_url;
const eventImageUrl = attachments[1] && attachments[1].image && attachments[1].image.pic_url;
if (!institutionImageUrl || !eventImageUrl) throw new Error('existing_group_images_required');

const signingKey = values.get('WECOM_IDENTITY_SIGNING_KEY') || crypto.randomBytes(48).toString('base64url');
const identityConfig = {
  institution: {
    label: '机构人员',
    description: '机构负责人、教务、教练或机构运营人员',
    tagId: institutionTagId,
    removeTagIds: [eventTagId],
    imageUrl: institutionImageUrl
  },
  event: {
    label: '赛事主理人',
    description: '赛事公司、协会、俱乐部或赛事运营负责人',
    tagId: eventTagId,
    removeTagIds: [institutionTagId],
    imageUrl: eventImageUrl
  }
};
const channelRules = [{
  state: currentRule.state,
  tagIds: currentRule.tagIds,
  identitySelector: true,
  welcome: {
    text: '您好，欢迎联系赛小蜂篮球！请点击下方入口选择您的身份。'
  }
}];

const updates = new Map([
  ['WECOM_ROUTER_ENABLED', 'false'],
  ['WECOM_IDENTITY_SIGNING_KEY', signingKey],
  ['WECOM_IDENTITY_SELECTOR_URL', 'https://api.saixiaofeng.com/wecom/identity'],
  ['WECOM_IDENTITY_TOKEN_TTL_SECONDS', '604800'],
  ['WECOM_IDENTITY_CONFIG_JSON', JSON.stringify(identityConfig)],
  ['WECOM_CHANNEL_RULES_JSON', JSON.stringify(channelRules)]
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
console.log('wecom_identity_env_configured');

