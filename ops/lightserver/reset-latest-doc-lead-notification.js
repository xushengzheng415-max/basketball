const fs = require('fs');

const stateFile = process.argv[2];
if (!stateFile) throw new Error('usage: node reset-latest-doc-lead-notification.js <state-file>');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const lead = state.leads && state.leads[state.leads.length - 1];
if (!lead) throw new Error('lead_not_found');
lead.notification_status = 'pending';
delete lead.notified_at;
delete lead.last_notification_error;
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log('latest_lead_notification_reset');
