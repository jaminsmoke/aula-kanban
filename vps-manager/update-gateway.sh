#!/bin/sh
# Update only the gateway code, preserving configuration and the replay store.
set -eu
test "$(id -u)" = 0 || { echo 'Se necesita ejecutar como root.' >&2; exit 1; }
expected_old=db4c03350dafc5f8aa82a60308a3e8092671e6f8bb89b114029e18b5ca258810
expected_new=116eceba781a0c4c65cacaaf4c111d5cb9e0b79db736cafd8de07ca724d9c063
target=/opt/aula-kanban-gateway/gateway.mjs
backup=/opt/aula-kanban-gateway/gateway.before-embedded-fix.mjs
test -f "$target" && test ! -L "$target" && test ! -e "$backup" || { echo 'La instalación no coincide con la esperada.' >&2; exit 1; }
[ "$(sha256sum "$target" | cut -d' ' -f1)" = "$expected_old" ] || { echo 'La pasarela ya ha cambiado: no se sobrescribe.' >&2; exit 1; }
[ "$(sha256sum gateway.mjs | cut -d' ' -f1)" = "$expected_new" ] || { echo 'El archivo nuevo no coincide.' >&2; exit 1; }
node --check gateway.mjs
cp -p "$target" "$backup"
install -o root -g root -m 644 gateway.mjs "$target"
if systemctl restart aula-gateway.service; then
  attempt=0
  while [ "$attempt" -lt 15 ]; do
    code=$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' -H 'Host: aula-agent.siberia.solutions' http://127.0.0.1:18765/ || true)
    [ "$code" = 403 ] && { echo 'Pasarela actualizada y acceso anónimo bloqueado.'; exit 0; }
    attempt=$((attempt + 1)); sleep 1
  done
fi
install -o root -g root -m 644 "$backup" "$target"
systemctl restart aula-gateway.service
echo 'No se pudo verificar la nueva pasarela; se restauró la anterior.' >&2
exit 1
