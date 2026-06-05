#!/bin/bash
# Primo avvio SSL: ottiene il certificato Let's Encrypt e attiva HTTPS.
# Da eseguire UNA SOLA VOLTA sul server, dopo aver puntato il dominio all'IP.
#
# Uso: ./scripts/init-ssl.sh

set -euo pipefail

# Carica variabili da .env
if [ ! -f .env ]; then
  echo "Errore: file .env non trovato. Copia .env.example in .env e compila i valori."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

if [ -z "${DOMAIN:-}" ]; then
  echo "Errore: variabile DOMAIN non impostata nel .env"
  exit 1
fi

if [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "Errore: variabile CERTBOT_EMAIL non impostata nel .env"
  exit 1
fi

echo "==> Dominio: $DOMAIN"
echo "==> Email:   $CERTBOT_EMAIL"
echo ""

# 1. Avvia nginx in modalità HTTP pura (se non è già in esecuzione)
echo "==> Avvio nginx HTTP..."
docker compose up -d nginx

sleep 3

# 2. Richiedi il certificato tramite webroot challenge
echo "==> Richiesta certificato Let's Encrypt..."
docker compose --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# 3. Attiva la config HTTPS sostituendo __DOMAIN__ con il dominio reale
echo "==> Attivazione config HTTPS..."
sed "s/__DOMAIN__/$DOMAIN/g" nginx/default-ssl.conf > nginx/conf.d/default.conf

# 4. Ricarica nginx con la nuova config
echo "==> Ricarica nginx..."
docker compose exec nginx nginx -s reload

echo ""
echo "✓ SSL attivo su https://$DOMAIN"
echo ""
echo "Per il rinnovo automatico, aggiungi al crontab del server:"
echo "  0 3 * * * cd $(pwd) && ./scripts/renew-ssl.sh >> /var/log/wherewIthin-ssl-renew.log 2>&1"
