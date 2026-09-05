const fs = require('fs');
const { createLeadToken } = require(process.env.WECOM_CORE_PATH || '../cloudfunctions/sxWecomDocAssistant/core');

async function main() {
  const state = JSON.parse(fs.readFileSync(process.env.WECOM_LEAD_STATE_FILE || '/data/leads.json', 'utf8'));
  const lead = state.leads && state.leads[state.leads.length - 1];
  if (!lead) throw new Error('lead_not_found');
  const token = createLeadToken(
    lead.lead_id,
    process.env.WECOM_LEAD_SIGNING_KEY,
    Number(process.env.WECOM_LEAD_TOKEN_TTL_SECONDS || 604800)
  );
  const url = new URL('/wecom/doc-assistant', process.env.WECOM_PUBLIC_BASE_URL);
  url.searchParams.set('lead_token', token);
  const response = await fetch(url);
  const html = await response.text();
  const matchesLead = html.includes(lead.lead_id) || (
    html.includes(lead.institution_name || '__missing__') && html.includes(lead.contact_phone || '__missing__')
  );
  if (!response.ok || !matchesLead || !html.includes('复制客户手机号')) {
    throw new Error(`lead_page_verification_failed_${response.status}`);
  }
  console.log(JSON.stringify({
    http_status: response.status,
    page_contains_lead: true,
    copy_phone_action_present: true
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
