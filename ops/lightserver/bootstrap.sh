#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  docker.io \
  docker-compose-v2 \
  fail2ban \
  nginx \
  ufw \
  unattended-upgrades

sudo timedatectl set-timezone Asia/Shanghai
sudo systemctl enable --now docker nginx fail2ban unattended-upgrades
sudo usermod -aG docker ubuntu

sudo install -d -m 0755 /opt/sxf-platform
sudo install -d -m 0750 -o ubuntu -g ubuntu /opt/sxf-platform/apps
sudo install -d -m 0750 -o ubuntu -g ubuntu /opt/sxf-platform/config
sudo install -d -m 0750 -o ubuntu -g ubuntu /opt/sxf-platform/logs

sudo install -m 0644 ./99-sxf-hardening.conf /etc/ssh/sshd_config.d/99-sxf-hardening.conf
sudo /usr/sbin/sshd -t
sudo systemctl reload ssh

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "bootstrap_complete"

