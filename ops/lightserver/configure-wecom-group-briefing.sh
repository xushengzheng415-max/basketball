#!/usr/bin/env bash
set -euo pipefail

readonly PLATFORM_DIR="${SXF_PLATFORM_DIR:-/opt/sxf-platform}"
readonly ENV_FILE="${PLATFORM_DIR}/config/wecom-group-briefing.env"
readonly DEFAULT_SOURCES="nba.com,cba.net.cn,fiba.basketball,sport.gov.cn,gov.cn,moe.gov.cn,news.cn,people.com.cn,chinanews.com.cn"

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

read_required() {
  local prompt="$1"
  local value=''
  while [[ -z "${value}" ]]; do
    IFS= read -r -p "${prompt}: " value
  done
  REPLY="${value}"
}

read_secret() {
  local prompt="$1"
  local value=''
  while [[ -z "${value}" ]]; do
    IFS= read -r -s -p "${prompt}: " value
    printf '\n'
  done
  REPLY="${value}"
}

[[ -f "${ENV_FILE}" ]] || fail "missing ${ENV_FILE}; run deploy-wecom-group-briefing.sh once first"
[[ -w "${ENV_FILE}" ]] || fail "${ENV_FILE} is not writable by the current user"

read_required '企业 CorpID'
wecom_corp_id="${REPLY}"
read_secret '客户联系可调用自建应用 Secret（输入不回显）'
wecom_secret="${REPLY}"
read_required '自建应用 AgentId'
wecom_agent_id="${REPLY}"
printf '%s\n' '内容模型：1=DeepSeek（使用你现有的 API） 2=OpenAI'
IFS= read -r -p '请选择 [1]: ' model_provider
model_provider="${model_provider:-1}"
case "${model_provider}" in
  1)
    model_provider='DeepSeek'
    model_base_url='https://api.deepseek.com'
    model_name='deepseek-v4-flash'
    ;;
  2)
    model_provider='OpenAI'
    model_base_url='https://api.openai.com/v1'
    model_name='gpt-5.5'
    ;;
  *) fail '内容模型只能选择 1 或 2' ;;
esac
read_secret "${model_provider} API Key（输入不回显）"
openai_key="${REPLY}"
read_required '晨报群主企业微信 UserID'
sender_userid="${REPLY}"
IFS= read -r -p '测试客户群 chat_id（暂不知道可留空）: ' chat_ids
IFS= read -r -p "来源域名白名单 [${DEFAULT_SOURCES}]: " source_domains
source_domains="${source_domains:-${DEFAULT_SOURCES}}"
read_secret '管理页密码（输入不回显，请自行妥善保存）'
admin_token="${REPLY}"

umask 077
temporary="${ENV_FILE}.tmp.$$"
trap 'rm -f "${temporary}"' EXIT

while IFS= read -r line || [[ -n "${line}" ]]; do
  key="${line%%=*}"
  case "${key}" in
    SERVICE_ENABLED) printf '%s\n' 'SERVICE_ENABLED=true' ;;
    SCHEDULER_ENABLED) printf '%s\n' 'SCHEDULER_ENABLED=false' ;;
    AUTO_CREATE_ENABLED) printf '%s\n' 'AUTO_CREATE_ENABLED=false' ;;
    AUTO_REMIND_ENABLED) printf '%s\n' 'AUTO_REMIND_ENABLED=false' ;;
    ADMIN_TOKEN) printf 'ADMIN_TOKEN=%s\n' "${admin_token}" ;;
    OPENAI_API_KEY) printf 'OPENAI_API_KEY=%s\n' "${openai_key}" ;;
    OPENAI_BASE_URL) printf 'OPENAI_BASE_URL=%s\n' "${model_base_url}" ;;
    OPENAI_MODEL) printf 'OPENAI_MODEL=%s\n' "${model_name}" ;;
    WECOM_CORP_ID) printf 'WECOM_CORP_ID=%s\n' "${wecom_corp_id}" ;;
    WECOM_CONTACT_SECRET) printf 'WECOM_CONTACT_SECRET=%s\n' "${wecom_secret}" ;;
    WECOM_AGENT_ID) printf 'WECOM_AGENT_ID=%s\n' "${wecom_agent_id}" ;;
    WECOM_SENDER_USERID) printf 'WECOM_SENDER_USERID=%s\n' "${sender_userid}" ;;
    WECOM_CHAT_ID_LIST) printf 'WECOM_CHAT_ID_LIST=%s\n' "${chat_ids}" ;;
    SOURCE_DOMAIN_ALLOWLIST) printf 'SOURCE_DOMAIN_ALLOWLIST=%s\n' "${source_domains}" ;;
    *) printf '%s\n' "${line}" ;;
  esac
done < "${ENV_FILE}" > "${temporary}"

chmod 0600 "${temporary}"
mv -f "${temporary}" "${ENV_FILE}"
trap - EXIT

unset wecom_secret openai_key admin_token
printf 'configuration_saved: %s\n' "${ENV_FILE}"
printf 'content_model_provider: %s\n' "${model_provider}"
printf 'content_model: %s\n' "${model_name}"
printf 'automation_remains_disabled\n'
printf 'next: cd %s && ./deploy-wecom-group-briefing.sh\n' "${PLATFORM_DIR}"
