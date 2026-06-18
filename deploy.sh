#!/bin/bash
set -euo pipefail

# =============================================================
# WhatsApp Team Manager — Deploy Script for Hostinger VPS
# Ubuntu 22.04 LTS
# =============================================================

REPO_URL="https://github.com/your-user/whatsapp-manager.git"
APP_DIR="/opt/whatsapp-manager"
DOMAIN=""

log() { echo -e "\n\033[1;32m[DEPLOY]\033[0m $1"; }
error() { echo -e "\n\033[1;31m[ERROR]\033[0m $1" >&2; exit 1; }

# ── 0. Parse arguments ────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --repo) REPO_URL="$2"; shift 2 ;;
        *) error "Unknown argument: $1" ;;
    esac
done

[[ -z "$DOMAIN" ]] && error "Use: $0 --domain yourdomain.com [--repo https://github.com/...]"

# ── 1. Update system ──────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$USER" || true
fi

if ! command -v docker-compose &>/dev/null; then
    log "Installing Docker Compose..."
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# ── 3. Install Certbot ────────────────────────────────────────
if ! command -v certbot &>/dev/null; then
    log "Installing Certbot..."
    apt-get install -y -qq certbot
fi

# ── 4. Clone or update repository ────────────────────────────
if [[ -d "$APP_DIR" ]]; then
    log "Pulling latest changes..."
    git -C "$APP_DIR" pull
else
    log "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ── 5. Setup .env ─────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
    log "Creating .env from example..."
    cp .env.example .env
    echo ""
    echo "  ⚠  Edit .env with your values before continuing:"
    echo "     nano $APP_DIR/.env"
    echo ""
    read -rp "Press ENTER after editing .env to continue..." _
fi

source .env

# ── 6. Update nginx domain ────────────────────────────────────
log "Configuring nginx for domain: $DOMAIN"
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/conf.d/default.conf

# ── 7. Get SSL certificate (HTTP challenge — nginx must be down) ──
log "Obtaining SSL certificate for $DOMAIN..."
# Temporarily start nginx HTTP-only for ACME challenge
docker-compose up -d nginx || true
sleep 3

certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "${ADMIN_EMAIL:-admin@$DOMAIN}" || {
    log "Certbot failed. Continuing without SSL (HTTP only)."
    # Fallback: HTTP-only nginx config
    sed -i 's/listen 443 ssl http2;/listen 443;/' nginx/conf.d/default.conf
    sed -i '/ssl_/d' nginx/conf.d/default.conf
    sed -i '/Strict-Transport-Security/d' nginx/conf.d/default.conf
}

# ── 8. Build and start all services ──────────────────────────
log "Building Docker images..."
docker-compose build --no-cache

log "Starting all services..."
docker-compose up -d

# ── 9. Run database migrations ────────────────────────────────
log "Running Prisma migrations..."
docker-compose exec -T backend npx prisma migrate deploy

# ── 10. Run seed (creates admin user) ────────────────────────
log "Running database seed..."
docker-compose exec -T backend npx ts-node src/prisma/seed.ts || \
    docker-compose exec -T backend node dist/prisma/seed.js || true

# ── 11. Setup Certbot auto-renewal ────────────────────────────
if crontab -l 2>/dev/null | grep -q certbot; then
    log "Certbot auto-renewal already configured."
else
    log "Setting up SSL certificate auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $APP_DIR/docker-compose.yml exec -T nginx nginx -s reload") | crontab -
fi

# ── Done ──────────────────────────────────────────────────────
log "✅ Deployment complete!"
echo ""
echo "  🌐 Application: https://$DOMAIN"
echo "  📊 Admin login: ${ADMIN_EMAIL:-admin@$DOMAIN}"
echo "  🔧 Configure webhook in Evolution API:"
echo "     URL: https://$DOMAIN/api/webhook/evolution"
echo "     Secret header: x-webhook-secret: \$WEBHOOK_SECRET"
echo ""
echo "  Useful commands:"
echo "    docker-compose logs -f backend    # backend logs"
echo "    docker-compose logs -f frontend   # frontend logs"
echo "    docker-compose restart backend    # restart backend"
