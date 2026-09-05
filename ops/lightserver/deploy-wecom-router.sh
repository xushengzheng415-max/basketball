#!/usr/bin/env bash
set -euo pipefail

cd /opt/sxf-platform

if [[ ! -f config/wecom-customer-router.env ]]; then
  install -m 0600 -o ubuntu -g ubuntu config/wecom-customer-router.env.example config/wecom-customer-router.env
fi

sudo install -m 0644 nginx-api.saixiaofeng.com.conf /etc/nginx/sites-available/api.saixiaofeng.com
sudo ln -sfn /etc/nginx/sites-available/api.saixiaofeng.com /etc/nginx/sites-enabled/api.saixiaofeng.com
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

docker compose build wecom-customer-router
docker compose up -d wecom-customer-router
docker compose ps

