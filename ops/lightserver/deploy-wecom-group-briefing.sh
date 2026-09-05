#!/usr/bin/env bash
set -euo pipefail

readonly PLATFORM_DIR="${SXF_PLATFORM_DIR:-/opt/sxf-platform}"
readonly COMPOSE_FILE="${PLATFORM_DIR}/docker-compose.briefing.yml"
readonly APP_DIR="${PLATFORM_DIR}/apps/wecom-group-briefing"
readonly CONFIG_DIR="${PLATFORM_DIR}/config"
readonly DATA_DIR="${PLATFORM_DIR}/data/wecom-group-briefing"
readonly ENV_EXAMPLE="${CONFIG_DIR}/wecom-group-briefing.env.example"
readonly ENV_FILE="${CONFIG_DIR}/wecom-group-briefing.env"
readonly HEALTH_URL="http://127.0.0.1:3400/health"

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required for health verification"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required"

[[ -d "${PLATFORM_DIR}" ]] || fail "missing ${PLATFORM_DIR}"
[[ -f "${COMPOSE_FILE}" ]] || fail "missing ${COMPOSE_FILE}; sync the deployment file first"
[[ -f "${APP_DIR}/Dockerfile" ]] || fail "missing ${APP_DIR}/Dockerfile; sync cloudfunctions/sxWecomGroupBriefing to ${APP_DIR} first"
[[ -f "${APP_DIR}/server.js" ]] || fail "missing ${APP_DIR}/server.js; application source is incomplete"
[[ -f "${ENV_EXAMPLE}" ]] || fail "missing ${ENV_EXAMPLE}; sync the example configuration first"

umask 077
install -d -m 0750 "${CONFIG_DIR}"
sudo install -d -m 0750 -o "$(id -un)" -g "$(id -gn)" "${DATA_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -m 0600 "${ENV_EXAMPLE}" "${ENV_FILE}"
  printf 'created %s with mode 0600\n' "${ENV_FILE}"
  printf 'fill the required values, keep automation switches false, then run this script again\n'
  exit 2
fi

chmod 0600 "${ENV_FILE}"

cd "${PLATFORM_DIR}"
docker compose -f "${COMPOSE_FILE}" build wecom-group-briefing
docker compose -f "${COMPOSE_FILE}" up -d wecom-group-briefing

healthy=false
for _attempt in $(seq 1 30); do
  if curl --fail --silent "${HEALTH_URL}" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done

docker compose -f "${COMPOSE_FILE}" ps wecom-group-briefing

if [[ "${healthy}" != "true" ]]; then
  docker compose -f "${COMPOSE_FILE}" logs --tail=100 wecom-group-briefing >&2
  fail "health check failed: ${HEALTH_URL}"
fi

curl --fail --silent --show-error "${HEALTH_URL}"
printf '\nwecom_group_briefing_deploy_complete\n'
