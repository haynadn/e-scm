#!/bin/bash
# =============================================
# e-SCM Deploy Script
# Usage: bash e-scm-deploy.sh [staging|production]
# =============================================

set -e

ENV=${1:-staging}
REPO_URL="https://github.com/haynadn/e-scm.git"

if [ "$ENV" == "staging" ]; then
  APP_DIR="/var/www/e-scm-staging"
  PM2_NAME="e-scm-staging"
  PORT=3002
elif [ "$ENV" == "production" ]; then
  echo "❌ Jangan deploy langsung ke production!"
  echo "👉 Gunakan: bash /var/www/scripts/e-scm-promote.sh"
  exit 1
else
  echo "❌ Environment tidak valid. Gunakan: staging"
  exit 1
fi

echo ""
echo "=========================================="
echo "🚀 Deploy e-SCM ke $ENV"
echo "   Dir: $APP_DIR"
echo "   PM2: $PM2_NAME"
echo "   Port: $PORT"
echo "=========================================="
echo ""

# 1. Clone atau pull
if [ ! -d "$APP_DIR" ]; then
  echo "📦 Cloning repo..."
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "📦 Pulling latest code..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
fi

cd "$APP_DIR"

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# 3. Pastikan .env ada
if [ ! -f ".env" ]; then
  echo "⚠️  File .env belum ada! Membuat dari template..."
  cat > .env << EOF
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=amar_db
DB_PASSWORD=GANTI_PASSWORD
DB_PORT=5432
JWT_SECRET=staging-secret-key-$(date +%s)
PORT=$PORT
EOF
  echo "⚠️  EDIT file .env dulu: nano $APP_DIR/.env"
  exit 1
fi

# 4. Update PORT di .env sesuai environment
sed -i "s/^PORT=.*/PORT=$PORT/" .env

# 5. Restart PM2
echo "🔄 Restarting PM2..."
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
else
  pm2 start server/index.js --name "$PM2_NAME"
fi

# 6. Health check (tunggu 5 detik)
echo "🏥 Health check..."
sleep 5

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null || echo "000")

if [ "$HEALTH" == "200" ]; then
  echo ""
  echo "=========================================="
  echo "✅ Deploy $ENV BERHASIL!"
  echo "   URL: http://localhost:$PORT"
  echo "=========================================="
  pm2 save
else
  echo ""
  echo "=========================================="
  echo "❌ Health check GAGAL (HTTP $HEALTH)"
  echo "   Cek logs: pm2 logs $PM2_NAME --lines 30"
  echo "=========================================="
  exit 1
fi
