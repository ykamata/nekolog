#!/bin/bash
#
# MySQL Daily Backup Script for Nekolog
# - Creates compressed mysqldump
# - Rotates backups (keeps last 7 days)
#

set -euo pipefail

# Configuration
BACKUP_DIR="/app/backups"
RETENTION_DAYS=7
CONTAINER_NAME="nekolog-mysql"
DB_NAME="nekolog"
DB_USER="ykamata"
DB_PASS="ykamata"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nekolog_${DATE}.sql.gz"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting MySQL backup..."

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: MySQL container '${CONTAINER_NAME}' is not running"
    exit 1
fi

# Execute mysqldump inside container and compress
if docker exec "${CONTAINER_NAME}" mysqldump \
    -u"${DB_USER}" \
    -p"${DB_PASS}" \
    --single-transaction \
    --routines \
    --triggers \
    --quick \
    "${DB_NAME}" 2>/dev/null | gzip > "${BACKUP_FILE}"; then

    FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "Backup created: ${BACKUP_FILE} (${FILESIZE})"
else
    log "ERROR: Backup failed"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
log "Removing backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "nekolog_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print -delete | wc -l)
log "Deleted ${DELETED_COUNT} old backup(s)"

# List current backups
log "Current backups:"
ls -lh "${BACKUP_DIR}"/nekolog_*.sql.gz 2>/dev/null || log "No backups found"

log "Backup completed successfully"
