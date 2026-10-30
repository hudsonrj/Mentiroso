#!/usr/bin/env bash
# Publica o site num servidor próprio e cria o registro no Cloudflare.
#
# Rode de uma máquina que alcance o servidor (ex.: na mesma rede Tailscale):
#   ./deploy/publicar-servidor.sh
#
# Variáveis (todas opcionais, com padrão):
#   SERVIDOR     usuário@host do servidor        (padrão: root@100.119.119.83)
#   DESTINO      pasta no servidor               (padrão: /root/apps/omentiroso)
#   PORTA        porta local do site no servidor (padrão: 8090)
#   DOMINIO      endereço público                (padrão: omentiroso.ch8ai.com.br)
#   CF_API_TOKEN token do Cloudflare com permissão "Zone:DNS:Edit" em ch8ai.com.br
#                (só é usado se o servidor não tiver o cloudflared configurado)
#
# A senha do SSH é pedida pelo próprio ssh; ela não fica gravada em lugar nenhum.

set -euo pipefail

SERVIDOR="${SERVIDOR:-root@100.119.119.83}"
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

echo "==> Configurando o servidor web na porta $PORTA"
remoto DESTINO="$DESTINO" PORTA="$PORTA" bash -s <<'REMOTO'
set -euo pipefail
if command -v docker >/dev/null 2>&1; then
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
curl -fsS -o /dev/null "http://127.0.0.1:$PORTA/" && echo "    site respondendo localmente"
REMOTO

echo "==> Cloudflare: $DOMINIO"
TUNEL=$(remoto "command -v cloudflared >/dev/null && cloudflared tunnel list 2>/dev/null | awk 'NR>1 && \$1 ~ /-/ {print \$2; exit}'" || true)
if [ -n "$TUNEL" ]; then
  echo "    túnel encontrado: $TUNEL"
  remoto "cloudflared tunnel route dns '$TUNEL' '$DOMINIO'" || echo "    (o registro DNS talvez já exista)"
  CONF=$(remoto "ls /etc/cloudflared/config.yml ~/.cloudflared/config.yml 2>/dev/null | head -1" || true)
  if [ -n "$CONF" ] && ! remoto "grep -q '$DOMINIO' '$CONF'"; then
    # Insere a regra antes do "catch-all" (http_status:404), que precisa ficar por último.
    remoto "cp '$CONF' '$CONF.bak' && python3 - '$CONF' '$DOMINIO' '$PORTA'" <<'PY'
import sys
conf, dominio, porta = sys.argv[1:]
linhas = open(conf).read().splitlines()
regra = [f"  - hostname: {dominio}", f"    service: http://localhost:{porta}"]
for i, l in enumerate(linhas):
    if "http_status:404" in l and l.strip().startswith("- service"):
        linhas[i:i] = regra
        break
else:
    linhas += ["ingress:"] + regra + ["  - service: http_status:404"]
open(conf, "w").write("\n".join(linhas) + "\n")
PY
    remoto "systemctl restart cloudflared 2>/dev/null || true"
    echo "    regra adicionada em $CONF (backup em $CONF.bak) e cloudflared reiniciado"
  fi
elif [ -n "${CF_API_TOKEN:-}" ]; then
  IP=$(remoto "curl -fsS https://api.ipify.org")
  ZONA=$(curl -fsS -H "Authorization: Bearer $CF_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=ch8ai.com.br" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"][0]["id"])')
  curl -fsS -X POST -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/zones/$ZONA/dns_records" \
    --data "{\"type\":\"A\",\"name\":\"$DOMINIO\",\"content\":\"$IP\",\"proxied\":true}" >/dev/null
  echo "    registro A $DOMINIO -> $IP criado (com proxy do Cloudflare)"
  echo "    atenção: neste modo o servidor precisa de um proxy (nginx/caddy) atendendo $DOMINIO na porta 80 e apontando para 127.0.0.1:$PORTA"
else
  echo "    o servidor não tem cloudflared e CF_API_TOKEN não foi informado: crie o registro manualmente."
fi

echo "==> Pronto. Teste: https://$DOMINIO"
