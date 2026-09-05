const { getAccessToken, requestJson } = require('../cloudfunctions/sxWecomCustomerRouter/core');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

async function main() {
  const corpId = required('WECOM_CORP_ID');
  const contactSecret = required('WECOM_CONTACT_SECRET');
  const userId = required('WECOM_CONTACT_USER_ID');
  const state = required('WECOM_CONTACT_STATE');
  const remark = String(process.env.WECOM_CONTACT_REMARK || '赛小蜂渠道客户入口').trim();
  const apply = String(process.env.WECOM_APPLY || '').toLowerCase() === 'true';
  const configuration = {
    type: 1,
    scene: 2,
    style: 1,
    remark,
    skip_verify: true,
    state,
    user: [userId]
  };

  if (!apply) {
    console.log(JSON.stringify({
      dryRun: true,
      message: 'Set WECOM_APPLY=true to create the contact way.',
      configuration
    }, null, 2));
    return;
  }

  const accessToken = await getAccessToken(corpId, contactSecret);
  const result = await requestJson(
    'POST',
    `/cgi-bin/externalcontact/add_contact_way?access_token=${encodeURIComponent(accessToken)}`,
    configuration
  );
  console.log(JSON.stringify({
    ok: true,
    configId: result.config_id || '',
    qrCodeUrl: result.qr_code || ''
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    code: error.message || 'unknown_error',
    errcode: error.errcode || 0
  }));
  process.exitCode = 1;
});

