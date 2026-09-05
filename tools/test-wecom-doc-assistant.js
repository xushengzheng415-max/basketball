const assert = require('assert');
const {
  answerValues,
  createLeadToken,
  leadFromAnswer,
  parseXmlFields,
  verifyLeadToken
} = require('../cloudfunctions/sxWecomDocAssistant/core');

const event = parseXmlFields('<xml><Event><![CDATA[doc_change]]></Event><ChangeType><![CDATA[collection_doc_complete]]></ChangeType></xml>');
assert.strictEqual(event.Event, 'doc_change');
assert.strictEqual(event.ChangeType, 'collection_doc_complete');

const formInfo = {
  form_question: {
    items: [
      { question_id: 1, title: '机构/主办方名称', option_item: [] },
      { question_id: 2, title: '赛制', option_item: [{ key: 1, value: '单败淘汰' }] },
      { question_id: 3, title: '参赛组别（可多选）', option_item: [{ key: 1, value: 'U8' }, { key: 2, value: 'U10' }] },
      { question_id: 4, title: '联系电话', option_item: [] },
      { question_id: 5, title: '计划开赛时间', option_item: [] }
    ]
  }
};
const answer = {
  answer_id: 7,
  reply: {
    items: [
      { question_id: 1, text_reply: '测试机构' },
      { question_id: 2, option_reply: [1] },
      { question_id: 3, option_reply: [1, 2] },
      { question_id: 4, text_reply: '138 0013 8000' },
      { question_id: 5, text_reply: '2026年9月1日' }
    ]
  },
  tmp_external_userid: 'tmp-user'
};

const values = answerValues(formInfo, answer);
assert.strictEqual(values['机构/主办方名称'], '测试机构');
assert.deepStrictEqual(values['参赛组别（可多选）'], ['U8', 'U10']);

const lead = leadFromAnswer('form-1', 'repeat-1', formInfo, answer);
assert.strictEqual(lead.institution_name, '测试机构');
assert.strictEqual(lead.contact_phone, '13800138000');
assert.strictEqual(lead.planned_start_date, '2026年9月1日');
assert.deepStrictEqual(lead.age_groups, ['U8', 'U10']);
assert.strictEqual(lead.notification_status, 'pending');

const signingKey = 'test-signing-key-with-at-least-thirty-two-characters';
const token = createLeadToken(lead.lead_id, signingKey, 60);
assert.strictEqual(verifyLeadToken(token, signingKey).lead_id, lead.lead_id);
assert.throws(() => verifyLeadToken(token, signingKey, Math.floor(Date.now() / 1000) + 61), /expired_lead_token/);

console.log('wecom doc assistant tests passed');
