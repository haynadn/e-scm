#!/bin/bash
# =============================================
# e-SCM Promote to Production Script
# Usage: bash e-scm-promote.sh
# =============================================

set -e

STAGING_DIR="/var/www/e-scm-staging"
PROD_DIR="/var/www/e-scm"
PM2_NAME="e-scm-app"
PORT=3001

echo ""
echo "=========================================="
echo "🚀 PROMOTE TO PRODUCTION: e-SCM"
echo "   Staging: $STAGING_DIR"
echo "   Prod:    $PROD_DIR"
echo "   PM2:     $PM2_NAME"
echo "   Port:    $PORT"
echo "=========================================="
echo ""

# 1. Validasi Staging
if [ ! -d "$STAGING_DIR" ]; then
  echo "❌ Error: Direktori staging ($STAGING_DIR) tidak ditemukan."
  exit 1
fi

# Pastikan staging lolos health check sebelum promote
echo "🏥 Memeriksa integrity staging (Port 3002)..."
HEALTH_STAGING=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH_STAGING" != "200" ]; then
  echo "❌ Error: Staging tidak sehat (HTTP $HEALTH_STAGING). Promote dibatalkan!"
  exit 1
fi
echo "✅ Staging aman."

# 2. Backup Production
if [ -d "$PROD_DIR" ]; then
  BACKUP_DIR="${PROD_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
  echo "📦 Membuat backup prod ke: $BACKUP_DIR"
  cp -r "$PROD_DIR" "$BACKUP_DIR"
else
  echo "⚠️ Direktori prod belum ada, akan dibuat baru."
  mkdir -p "$PROD_DIR"
fi

# 3. Sinkronisasi (rsync copy staging -> prod, exclude .env dan node_modules)
echo "🔄 Mengcopy dari Staging ke Prod..."
rsync -a --exclude 'node_modules' --exclude '.env' --exclude '.git' "$STAGING_DIR/" "$PROD_DIR/"

cd "$PROD_DIR"

# 4. Install dependencies production
echo "📦 Installing prod dependencies..."
npm install --production

# 5. Pastikan .env valid
if [ ! -f ".env" ]; then
  echo "❌ Error: .env tidak ditemukan di $PROD_DIR!"
  if [ -d "$BACKUP_DIR" ]; then
     echo "🔄 Rollback: Mengembalikan backup..."
     rm -rf "$PROD_DIR"
     mv "$BACKUP_DIR" "$PROD_DIR"
  fi
  exit 1
fi

# Update PORT di .env prod untuk memastikan portnya 3001
sed -i "s/^PORT=.*/PORT=$PORT/" .env

# 6. Restart PM2 Production
echo "🔄 Restarting PM2 Prod..."
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
else
  pm2 start server/index.js --name "$PM2_NAME"
fi

# 7. Final Health check
echo "🏥 Prod Health check..."
sleep 5

HEALTH_PROD=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null || echo "000")

if [ "$HEALTH_PROD" == "200" ]; then
  echo ""
  echo "=========================================="
  echo "🎉 PROMOTE KE PRODUCTION BERHASIL!"
  echo "   URL Prod: http://localhost:$PORT"
  echo "=========================================="
  pm2 save
  
  # Opsional: hapus backup lama jika sukses
  # rm -rf "$BACKUP_DIR"
else
  echo ""
  echo "=========================================="
  echo "❌ Prod Health check GAGAL (HTTP $HEALTH_PROD)"
  echo "   🔄 Memulai rollback..."
  
  if [ -d "$BACKUP_DIR" ]; then
     rm -rf "$PROD_DIR"
     mv "$BACKUP_DIR" "$PROD_DIR"
     cd "$PROD_DIR"
     pm2 restart "$PM2_NAME"
     echo "   ✅ Rollback selesai."
  else
     echo "   ❌ Tidak ada backup untuk rollback!"
  fi
  echo "=========================================="
  exit 1
fi
