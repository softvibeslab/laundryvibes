#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$ROOT_DIR/secrets"
TARGET="$SECRETS_DIR/production.env"

printf '%s\n' 'Pega la URI mongodb+srv de Atlas. No se mostrará en pantalla.'
IFS= read -r -s -p 'MongoDB Atlas URI: ' mongo_uri
printf '\n'

if [[ ! "$mongo_uri" =~ ^mongodb\+srv:// ]]; then
  printf '%s\n' 'Error: la URI debe comenzar con mongodb+srv://' >&2
  exit 1
fi
if [[ "$mongo_uri" == *'<'* || "$mongo_uri" == *'>'* || "$mongo_uri" == *'***'* ]]; then
  printf '%s\n' 'Error: sustituye <db_password> y cualquier placeholder antes de continuar.' >&2
  exit 1
fi
uri_without_query="${mongo_uri%%\?*}"
authority_and_path="${uri_without_query#mongodb+srv://}"
database_path="${authority_and_path#*/}"
if [[ "$database_path" == "$authority_and_path" || "$database_path" != 'laundryvibes' ]]; then
  printf '%s\n' 'Error: la URI debe seleccionar exactamente /laundryvibes antes de los parámetros.' >&2
  exit 1
fi

jwt_secret="$(openssl rand -hex 48)"
umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"
tmp_file="$(mktemp "$SECRETS_DIR/.production.env.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT

{
  printf 'MONGODB_URL=%s\n' "$mongo_uri"
  printf 'JWT_SECRET=%s\n' "$jwt_secret"
  printf 'FRONTEND_URL=https://laundryvibes.rovicrm.com\n'
  printf 'CORS_ORIGINS=https://laundryvibes.rovicrm.com\n'
  printf 'JWT_EXPIRES_IN=1h\n'
  printf 'RESET_TOKEN_TTL_MINUTES=15\n'
  printf 'PAYLOAD_LIMIT=100kb\n'
  printf 'EMAIL_USER=\n'
  printf 'EMAIL_PASSWORD=\n'
  printf 'TWILIO_ACCOUNT_SID=\n'
  printf 'TWILIO_AUTH_TOKEN=\n'
  printf 'TWILIO_PHONE_NUMBER=\n'
} > "$tmp_file"

chmod 600 "$tmp_file"
mv "$tmp_file" "$TARGET"
trap - EXIT
printf 'Configuración privada creada en %s (modo 600).\n' "$TARGET"
