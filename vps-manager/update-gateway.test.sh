#!/bin/sh
# Runs exclusively in a disposable container; it does not touch the host VPS.
set -eu
mkdir -p /mock /opt/aula-kanban-gateway
cp /tmp/old-gateway.mjs /opt/aula-kanban-gateway/gateway.mjs
printf '#!/bin/sh\nexit 0\n' > /mock/node
printf '#!/bin/sh\nprintf 403\n' > /mock/curl
cat > /mock/systemctl <<'EOF'
#!/bin/sh
if [ "${MOCK_FAIL:-0}" = 1 ] && [ ! -e /tmp/restart-failed ]; then touch /tmp/restart-failed; exit 1; fi
exit 0
EOF
chmod 755 /mock/*
export PATH="/mock:$PATH"
cd /tmp/aula
if [ "${MOCK_FAIL:-0}" = 1 ]; then
  if sh update-gateway.sh; then echo 'No se ha comprobado la restauración.' >&2; exit 1; fi
  cmp /opt/aula-kanban-gateway/gateway.mjs /tmp/old-gateway.mjs
  echo 'Restauración comprobada.'
else
  sh update-gateway.sh
  cmp /opt/aula-kanban-gateway/gateway.mjs gateway.mjs
  cmp /opt/aula-kanban-gateway/gateway.before-embedded-fix.mjs /tmp/old-gateway.mjs
  echo 'Actualización comprobada.'
fi
