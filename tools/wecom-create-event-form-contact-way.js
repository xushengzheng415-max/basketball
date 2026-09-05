const fs = require('fs');
const { getAccessToken, requestJson } = require(
  process.env.WECOM_CORE_PATH || '../cloudfunctions/sxWecomCustomerRouter/core'
);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

async function main() {
  const outputFile = required('WECOM_CONTACT_OUTPUT');
  if (fs.existsSync(outputFile)) {
    process.stdout.write(fs.readFileSync(outputFile, 'utf8'));
    return;
  }

  const corpId = required('WECOM_CORP_ID');
  const secret = required('WECOM_CONTACT_SECRET');
  const userId = required('WECOM_CONTACT_USER_ID');
  const state = required('WECOM_CONTACT_STATE');
  const accessToken = await getAccessToken(corpId, secret);
  const tagList = await requestJson(
    'POST',
    `/cgi-bin/externalcontact/get_corp_tag_list?access_token=${encodeURIComponent(accessToken)}`,
    {}
  );
  const sourceGroup = (tagList.tag_group || []).find((group) => group.group_name === '来源渠道');
  let sourceTag = sourceGroup && (sourceGroup.tag || []).find((tag) => tag.name === '赛事需求表');
  if (!sourceTag) {
    const created = await requestJson(
      'POST',
      `/cgi-bin/externalcontact/add_corp_tag?access_token=${encodeURIComponent(accessToken)}`,
      sourceGroup
        ? { group_id: sourceGroup.group_id, tag: [{ name: '赛事需求表' }] }
        : { group_name: '来源渠道', tag: [{ name: '赛事需求表' }] }
    );
    sourceTag = (created.tag_group?.tag || []).find((tag) => tag.name === '赛事需求表');
  }
  if (!sourceTag?.id) throw new Error('source_tag_not_created');

  const contact = await requestJson(
    'POST',
    `/cgi-bin/externalcontact/add_contact_way?access_token=${encodeURIComponent(accessToken)}`,
    {
      type: 1,
      scene: 2,
      style: 1,
      remark: '客户赛事需求表企微入口',
      skip_verify: true,
      state,
      user: [userId]
    }
  );
  const result = {
    state,
    sourceTagId: sourceTag.id,
    configId: contact.config_id,
    qrCodeUrl: contact.qr_code,
    createdAt: new Date().toISOString()
  };
  fs.mkdirSync(require('path').dirname(outputFile), { recursive: true, mode: 0o700 });
  fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, code: error.message, errcode: error.errcode || 0 }));
  process.exitCode = 1;
});

