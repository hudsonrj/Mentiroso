#!/usr/bin/env bash
# Publica o site num servidor próprio e cria o registro no Cloudflare.
#
# Rode de uma máquina que alcance o servidor (ex.: na mesma rede Tailscale):
#   ./deploy/publicar-servidor.sh
#
# Variáveis (todas opcionais, com padrão):
#   SERVIDOR     usuário@host do servidor        (padrão: root@169.58.19.232)
#   DESTINO      pasta no servidor               (padrão: /root/apps/omentiroso)
#   PORTA        porta local do site no servidor (padrão: 8090)
#   DOMINIO      endereço público                (padrão: omentiroso.ch8ai.com.br)
#   CF_API_TOKEN token do Cloudflare com permissão "Zone:DNS:Edit" em ch8ai.com.br
#                (sem ele, o script mostra o registro a criar à mão)
#   IP_PUBLICO   IP para o registro DNS (padrão: o host de SERVIDOR)
#
# A senha do SSH é pedida pelo próprio ssh; ela não fica gravada em lugar nenhum.

set -euo pipefail

SERVIDOR="${SERVIDOR:-root@169.58.19.232}"
DESTINO="${DESTINO:-/root/apps/omentiroso}"
PORTA="${PORTA:-8090}"
DOMINIO="${DOMINIO:-omentiroso.ch8ai.com.br}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
CTL="/tmp/omentiroso-ssh-$$"

# Uma única conexão SSH reaproveitada, para pedir a senha só uma vez.
ssh -o ControlMaster=yes -o ControlPath="$CTL" -o ControlPersist=10m -o StrictHostKeyChecking=accept-new -fN "$SERVIDOR"
trap 'ssh -o ControlPath="$CTL" -O exit "$SERVIDOR" 2>/dev/null || true' EXIT
remoto() { ssh -o ControlPath="$CTL" "$SERVIDOR" "$@"; }

echo "==> Enviando o site para $SERVIDOR:$DESTINO"
remoto "mkdir -p '$DESTINO'"
tar -C "$RAIZ" -czf - public scripts | remoto "tar -C '$DESTINO' -xzf -"

echo "==> Configurando o servidor web"
remoto DESTINO="$DESTINO" PORTA="$PORTA" DOMINIO="$DOMINIO" bash -s <<'REMOTO'
set -euo pipefail
CADDYFILE=/etc/caddy/Caddyfile
if command -v caddy >/dev/null 2>&1 && [ -f "$CADDYFILE" ]; then
  # O Caddy já instalado serve os arquivos direto e cuida do HTTPS.
  if ! grep -q "^$DOMINIO" "$CADDYFILE"; then
    cp "$CADDYFILE" "$CADDYFILE.bak-omentiroso"
    printf '\n%s {\n\troot * %s/public\n\tencode gzip\n\tfile_server\n}\n' "$DOMINIO" "$DESTINO" >> "$CADDYFILE"
  fi
  # O Caddy roda como usuário "caddy" e precisa conseguir ler a pasta dentro de /root.
  chmod o+x /root /root/apps "$DESTINO"
  chmod -R o+rX "$DESTINO/public"
  caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null
  systemctl reload caddy
  echo "    Caddy servindo $DOMINIO a partir de $DESTINO/public (backup em $CADDYFILE.bak-omentiroso)"
  SERVIDO_PELO_CADDY=1
elif command -v docker >/dev/null 2>&1; then
  docker rm -f omentiroso >/dev/null 2>&1 || true
  docker run -d --name omentiroso --restart unless-stopped \
    -p 127.0.0.1:"$PORTA":80 -v "$DESTINO/public":/usr/share/nginx/html:ro nginx:alpine >/dev/null
  echo "    nginx (Docker) rodando em 127.0.0.1:$PORTA"
else
  cat > /etc/systemd/system/omentiroso.service <<EOF
[Unit]
Description=O Mentiroso (site estático)
After=network.target

[Service]
ExecStart=/usr/bin/env python3 -m http.server $PORTA --bind 127.0.0.1 --directory $DESTINO/public
Restart=always

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now omentiroso >/dev/null
  systemctl restart omentiroso
  echo "    serviço systemd 'omentiroso' rodando em 127.0.0.1:$PORTA"
fi

# Atualiza os dados oficiais todo dia às 07:17, se houver Node 18+ no servidor.
if command -v node >/dev/null 2>&1; then
  ( crontab -l 2>/dev/null | grep -v 'omentiroso-atualizar' ;
    echo "17 7 * * * cd $DESTINO && node scripts/atualizar-dados.mjs >/var/log/omentiroso-atualizar.log 2>&1 # omentiroso-atualizar" ) | crontab -
  echo "    atualização diária dos dados agendada no cron"
else
  echo "    aviso: Node não encontrado; os dados só serão atualizados ao vivo pelo navegador"
fi

sleep 1
if [ -z "${SERVIDO_PELO_CADDY:-}" ]; then
  curl -fsS -o /dev/null "http://127.0.0.1:$PORTA/" && echo "    site respondendo localmente"
fi
REMOTO

echo "==> Cloudflare: $DOMINIO"
if [ -n "${CF_API_TOKEN:-}" ]; then
  # Registro A só de DNS (sem o proxy laranja), para o Caddy do servidor conseguir emitir o certificado HTTPS.
  IP="${IP_PUBLICO:-${SERVIDOR#*@}}"
  ZONA=$(curl -fsS -H "Authorization: Bearer $CF_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=${DOMINIO#*.}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"][0]["id"])')
  EXISTE=$(curl -fsS -H "Authorization: Bearer $CF_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$ZONA/dns_records?name=$DOMINIO" | python3 -c 'import json,sys;r=json.load(sys.stdin)["result"];print(r[0]["id"] if r else "")')
  CORPO="{\"type\":\"A\",\"name\":\"$DOMINIO\",\"content\":\"$IP\",\"proxied\":false,\"ttl\":300}"
  if [ -n "$EXISTE" ]; then
    curl -fsS -X PUT -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/zones/$ZONA/dns_records/$EXISTE" --data "$CORPO" >/dev/null
    echo "    registro $DOMINIO atualizado para $IP"
  else
    curl -fsS -X POST -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/zones/$ZONA/dns_records" --data "$CORPO" >/dev/null
    echo "    registro A $DOMINIO -> $IP criado"
  fi
else
  echo "    CF_API_TOKEN não informado. Crie no Cloudflare (DNS de ${DOMINIO#*.}) um registro:"
  echo "      tipo A · nome ${DOMINIO%%.*} · conteúdo ${IP_PUBLICO:-${SERVIDOR#*@}} · proxy DESLIGADO (nuvem cinza)"
fi

echo "==> Pronto. Em alguns minutos o Caddy emite o certificado. Teste: https://$DOMINIO"
