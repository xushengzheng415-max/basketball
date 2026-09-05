const fs = require('fs');
const https = require('https');
const path = require('path');
const {
  getAccessToken,
  requestJson
} = require('./core');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function uploadImage(accessToken, filePath) {
  const file = fs.readFileSync(filePath);
  if (file.length < 5 || file.length > 2 * 1024 * 1024) throw new Error(`invalid_image_size_${path.basename(filePath)}`);
  const boundary = `----sxf${Date.now().toString(16)}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="media"; filename="${path.basename(filePath)}"\r\n` +
    'Content-Type: image/png\r\n\r\n',
    'utf8'
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const body = Buffer.concat([header, file, footer]);

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'qyapi.weixin.qq.com',
      port: 443,
      path: `/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      timeout: 10000
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let data;
        try {
          data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch (error) {
          reject(new Error('invalid_uploadimg_response'));
          return;
        }
        if (data.errcode) {
          const apiError = new Error(`wecom_uploadimg_error_${data.errcode}`);
          apiError.errcode = data.errcode;
          apiError.errmsg = data.errmsg;
          reject(apiError);
          return;
        }
        resolve(data.url);
      });
    });
    request.on('timeout', () => request.destroy(new Error('wecom_uploadimg_timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

async function findTag(accessToken, groupName, tagName) {
  const data = await requestJson(
    'POST',
    `/cgi-bin/externalcontact/get_corp_tag_list?access_token=${encodeURIComponent(accessToken)}`,
    {}
  );
  for (const group of data.tag_group || []) {
    if (group.deleted || group.group_name !== groupName) continue;
    for (const tag of group.tag || []) {
      if (!tag.deleted && tag.name === tagName) return { groupId: group.group_id, tagId: tag.id };
    }
  }
  throw new Error('configured_wecom_tag_not_found');
}

async function resolveUserId(accessToken) {
  const configured = String(process.env.WECOM_PROVISION_USER_ID || '').trim();
  if (configured) return configured;
  const data = await requestJson(
    'GET',
    `/cgi-bin/externalcontact/get_follow_user_list?access_token=${encodeURIComponent(accessToken)}`
  );
  const users = data.follow_user || [];
  if (users.length !== 1) throw new Error('wecom_provision_user_id_required');
  return users[0];
}

async function main() {
  const corpId = required('WECOM_CORP_ID');
  const secret = required('WECOM_CONTACT_SECRET');
  const state = String(process.env.WECOM_PROVISION_STATE || 'sxf_official_article_footer').trim();
  const remark = String(process.env.WECOM_PROVISION_REMARK || '公众号文章统一客户入口').trim();
  const groupName = String(process.env.WECOM_PROVISION_TAG_GROUP_NAME || '来源渠道').trim();
  const tagName = String(process.env.WECOM_PROVISION_TAG_NAME || '公众号').trim();
  const institutionImage = String(process.env.WECOM_INSTITUTION_IMAGE || '/assets/wecom/institution-community.png').trim();
  const eventImage = String(process.env.WECOM_EVENT_IMAGE || '/assets/wecom/event-organizer-community.png').trim();
  const apply = String(process.env.WECOM_PROVISION_APPLY || '').toLowerCase() === 'true';
  const accessToken = await getAccessToken(corpId, secret);
  const tag = await findTag(accessToken, groupName, tagName);
  const userId = await resolveUserId(accessToken);

  if (!apply) {
    console.log(JSON.stringify({
      dryRun: true,
      state,
      remark,
      groupName,
      tagName,
      tagId: tag.tagId,
      userId,
      institutionImageBytes: fs.statSync(institutionImage).size,
      eventImageBytes: fs.statSync(eventImage).size
    }));
    return;
  }

  const institutionPicUrl = await uploadImage(accessToken, institutionImage);
  const eventPicUrl = await uploadImage(accessToken, eventImage);
  const contactWay = await requestJson(
    'POST',
    `/cgi-bin/externalcontact/add_contact_way?access_token=${encodeURIComponent(accessToken)}`,
    {
      type: 1,
      scene: 2,
      style: 1,
      remark,
      skip_verify: true,
      state,
      user: [userId]
    }
  );
  const rule = {
    state,
    tagIds: [tag.tagId],
    welcome: {
      text: '您好，欢迎联系赛小蜂篮球！请根据您的身份，长按对应二维码加入交流群。',
      attachments: [
        { msgtype: 'image', image: { pic_url: institutionPicUrl } },
        { msgtype: 'image', image: { pic_url: eventPicUrl } }
      ]
    }
  };

  console.log(JSON.stringify({
    ok: true,
    state,
    tagId: tag.tagId,
    userId,
    institutionPicUrl,
    eventPicUrl,
    configId: contactWay.config_id || '',
    qrCodeUrl: contactWay.qr_code || '',
    channelRulesJson: JSON.stringify([rule])
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    code: error.message || 'unknown_error',
    errcode: error.errcode || 0
  }));
  process.exitCode = 1;
});

