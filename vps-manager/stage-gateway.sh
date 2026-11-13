#!/bin/sh
# Stages an isolated AFFiNE gateway on loopback. Does not change Caddy or
# publish any application. Requires a reviewed copy of this directory.
set -eu
test "$(id -u)" = 0 || { echo 'Se necesita ejecutar como root.' >&2; exit 1; }
: "${AULA_SITE_ORIGIN:?Falta AULA_SITE_ORIGIN}"
: "${AULA_GATEWAY_PUBLIC_ORIGIN:?Falta AULA_GATEWAY_PUBLIC_ORIGIN}"
: "${AULA_INSTANCE_ID:?Falta AULA_INSTANCE_ID}"
: "${AULA_MANAGER_ENV:?Falta AULA_MANAGER_ENV}"
case "$AULA_SITE_ORIGIN" in https://*[!A-Za-z0-9.:/-]*|https://*/?*|http://*|'') echo 'Origen de Site no válido.' >&2; exit 1;; https://*) ;; *) exit 1;; esac
case "$AULA_GATEWAY_PUBLIC_ORIGIN" in https://*[!A-Za-z0-9.:/-]*|https://*/?*|http://*|'') echo 'Origen de pasarela no válido.' >&2; exit 1;; https://*) ;; *) exit 1;; esac
case "$AULA_INSTANCE_ID" in *[!A-Za-z0-9_-]*|'') echo 'Identificador no válido.' >&2; exit 1;; esac
test -f "$AULA_MANAGER_ENV" && test ! -L "$AULA_MANAGER_ENV" || { echo 'No se encuentra el secreto del gestor.' >&2; exit 1; }
test ! -e /etc/systemd/system/aula-gateway.service && test ! -e /etc/aula-kanban-gateway.env && test ! -e /opt/aula-kanban-gateway || { echo 'Ya existe una instalación: no se sobrescribe.' >&2; exit 1; }
if id aula-gateway >/dev/null 2>&1; then echo 'Ya existe el usuario aula-gateway: revisar antes de continuar.' >&2; exit 1; fi
for f in gateway-main.mjs gateway.mjs session-gate.mjs access-tickets.mjs replay-store.mjs site-authorizer.mjs; do test -f "$f" && test ! -L "$f" || { echo 'Faltan archivos de pasarela.' >&2; exit 1; }; done
command -v node >/dev/null
command -v python3 >/dev/null
command -v systemctl >/dev/null
node -e "require('node:sqlite')" >/dev/null
if ss -ltn | awk '{print $4}' | grep -Eq '(^|:)18765$'; then echo 'El puerto local 18765 ya está ocupado.' >&2; exit 1; fi

useradd --system --home-dir /var/lib/aula-kanban-gateway --no-create-home --shell /usr/sbin/nologin aula-gateway
install -d -o root -g root -m 755 /opt/aula-kanban-gateway
install -d -o aula-gateway -g aula-gateway -m 700 /var/lib/aula-kanban-gateway
install -o root -g root -m 644 gateway-main.mjs gateway.mjs session-gate.mjs access-tickets.mjs replay-store.mjs site-authorizer.mjs /opt/aula-kanban-gateway/

# Root derives two independent keys without exposing the manager token to the
# service user, command line, terminal output, shell history, or a browser.
export AULA_SITE_ORIGIN AULA_GATEWAY_PUBLIC_ORIGIN AULA_INSTANCE_ID AULA_MANAGER_ENV
python3 - <<'PY'
import base64, hashlib, hmac, os, re
from pathlib import Path
lines = Path(os.environ['AULA_MANAGER_ENV']).read_text().splitlines()
values = [x.split('=', 1)[1] for x in lines if x.startswith('SPACE_MANAGER_TOKEN=')]
if len(values) != 1 or not re.fullmatch(r'[A-Za-z0-9_-]{32,512}', values[0]):
    raise SystemExit('Formato de secreto del gestor no válido.')
def derive(purpose):
    return base64.urlsafe_b64encode(hmac.new(values[0].encode(), ('aula-kanban:gateway:v1:' + purpose).encode(), hashlib.sha256).digest()).decode().rstrip('=')
settings = {
    'AULA_GATEWAY_EXPERIMENTAL':'1', 'AULA_GATEWAY_PORT':'18765', 'AULA_GATEWAY_UPSTREAM_PORT':'3010',
    'AULA_GATEWAY_APP':'affine', 'AULA_GATEWAY_SETUP_ONLY':'1',
    'AULA_GATEWAY_REPLAY_DB':'/var/lib/aula-kanban-gateway/replay.sqlite',
    'AULA_GATEWAY_AUDIENCE':os.environ['AULA_INSTANCE_ID'], 'AULA_SITE_ORIGIN':os.environ['AULA_SITE_ORIGIN'],
    'AULA_GATEWAY_PUBLIC_ORIGIN':os.environ['AULA_GATEWAY_PUBLIC_ORIGIN'],
    'AULA_GATEWAY_TICKET_SECRET':derive('ticket'), 'AULA_GATEWAY_SERVICE_TOKEN':derive('service'),
}
fd = os.open('/etc/aula-kanban-gateway.env', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as f:
    for key, value in settings.items(): f.write(f'{key}={value}\n')
PY

cat > /etc/systemd/system/aula-gateway.service <<'UNIT'
[Unit]
Description=Pasarela aislada de Aula Kanban
After=network-online.target
Wants=network-online.target
[Service]
User=aula-gateway
Group=aula-gateway
EnvironmentFile=/etc/aula-kanban-gateway.env
ExecStart=/usr/bin/node /opt/aula-kanban-gateway/gateway-main.mjs
Restart=on-failure
UMask=0077
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/aula-kanban-gateway
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now aula-gateway.service
systemctl is-active --quiet aula-gateway.service || { echo 'La pasarela no ha arrancado; Caddy sigue cerrado.' >&2; exit 1; }
attempt=0
code=000
while [ "$attempt" -lt 15 ]; do
  code=$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' -H "Host: ${AULA_GATEWAY_PUBLIC_ORIGIN#https://}" http://127.0.0.1:18765/ || true)
  [ "$code" = 403 ] && break
  attempt=$((attempt + 1))
  sleep 1
done
test "$code" = 403 || { echo 'La pasarela no deniega correctamente; Caddy sigue cerrado.' >&2; exit 1; }
echo 'Pasarela preparada en loopback; acceso público sin cambios.'
