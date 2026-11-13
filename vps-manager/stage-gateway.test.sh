#!/bin/sh
# Runs only inside a disposable container, with systemctl and networking mocked.
set -eu
mkdir -p /mock /etc/systemd/system
cat > /mock/id <<'EOF'
#!/bin/sh
[ "$1" = '-u' ] && { echo 0; exit 0; }
exit 1
EOF
cat > /mock/useradd <<'EOF'
#!/bin/sh
addgroup -S aula-gateway
adduser -S -D -H -G aula-gateway aula-gateway
EOF
for c in node systemctl ss; do printf '#!/bin/sh\nexit 0\n' > "/mock/$c"; done
printf '#!/bin/sh\nprintf 403\n' > /mock/curl
chmod 755 /mock/*
export PATH="/mock:$PATH"
export AULA_SITE_ORIGIN=https://site.example
export AULA_GATEWAY_PUBLIC_ORIGIN=https://gateway.example
export AULA_INSTANCE_ID=appgprj_test
export AULA_MANAGER_ENV=/test-manager.env
printf 'SPACE_MANAGER_TOKEN=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n' > "$AULA_MANAGER_ENV"
cd /tmp/aula
sh stage-gateway.sh
test -f /etc/systemd/system/aula-gateway.service
test -f /opt/aula-kanban-gateway/gateway-main.mjs
test "$(stat -c %a /etc/aula-kanban-gateway.env)" = 600
! grep -q 'SPACE_MANAGER_TOKEN' /etc/aula-kanban-gateway.env
grep -q '^AULA_GATEWAY_SETUP_ONLY=1$' /etc/aula-kanban-gateway.env
grep -q '^User=aula-gateway$' /etc/systemd/system/aula-gateway.service
echo 'Aislamiento y configuración verificados.'
