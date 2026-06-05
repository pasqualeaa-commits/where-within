#!/bin/bash
# Rinnovo automatico del certificato SSL.
# Certbot rinnova solo se il cert scade entro 30 giorni — sicuro da eseguire ogni giorno.
#
# Aggiungi al crontab: 0 3 * * * cd /path/to/where-within && ./scripts/renew-ssl.sh

set -euo pipefail

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Avvio rinnovo SSL..."

docker compose --profile certbot run --rm certbot renew --webroot --webroot-path=/var/www/certbot

# Ricarica nginx solo se il cert è stato rinnovato
docker compose exec nginx nginx -s reload

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rinnovo completato."
