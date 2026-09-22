#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
BACKUP_FILE="${1:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-aurlemon-postgres}"
MYSQL_CONTAINER="fjcpc-teps-import-mysql-$$"
NETWORK_NAME="fjcpc-teps-import-network-$$"
WORK_DIR="$(mktemp -d)"

cleanup() {
  docker rm -f "${MYSQL_CONTAINER}" >/dev/null 2>&1 || true
  docker network rm "${NETWORK_NAME}" >/dev/null 2>&1 || true
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 /absolute/path/to/mysql-backup.sql.zip" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.example first." >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

for required in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do
  if [[ -z "${!required:-}" ]]; then
    echo "${required} must be set in ${ENV_FILE}" >&2
    exit 1
  fi
done

if [[ ! "${DB_USER}" =~ ^[A-Za-z0-9_-]+$ || ! "${DB_NAME}" =~ ^[A-Za-z0-9_-]+$ || ! "${DB_PASSWORD}" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "DB_USER/DB_NAME must be alphanumeric, underscore, or hyphen; DB_PASSWORD must be alphanumeric." >&2
  exit 1
fi

if ! docker inspect "${POSTGRES_CONTAINER}" >/dev/null 2>&1; then
  echo "PostgreSQL container ${POSTGRES_CONTAINER} is not available." >&2
  exit 1
fi

if docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -qx '1'; then
  expected_tables=(typeorm_migrations users user_settings tokens login_key request_info request_log questions done_questions star_questions updated_questions)
  existing_tables="$(docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d "${DB_NAME}" -Atc "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")"
  for table in ${existing_tables}; do
    if [[ " ${expected_tables[*]} " != *" ${table} "* ]]; then
      echo "Database ${DB_NAME} contains unexpected table ${table}; refusing to overwrite it." >&2
      exit 1
    fi
  done

  for table in "${expected_tables[@]}"; do
    if [[ "${table}" == 'typeorm_migrations' ]]; then
      continue
    fi

    row_count="$(docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM \"${table}\"" 2>/dev/null || true)"
    if [[ -n "${row_count}" && "${row_count}" != '0' ]]; then
      echo "Database ${DB_NAME} already contains data in ${table}; refusing to overwrite it." >&2
      exit 1
    fi
  done
else
  docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE \"${DB_USER}\" LOGIN PASSWORD '${DB_PASSWORD}'"
  docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\""
fi

pnpm backend:build
pnpm db:migrate

unzip -p "${BACKUP_FILE}" > "${WORK_DIR}/backup.sql"
docker network create "${NETWORK_NAME}" >/dev/null
docker run -d --platform linux/amd64 --name "${MYSQL_CONTAINER}" --network "${NETWORK_NAME}" \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
  -e MYSQL_DATABASE=fjcpc-teps \
  -v "${WORK_DIR}/backup.sql:/docker-entrypoint-initdb.d/backup.sql:ro" \
  mysql:5.7 >/dev/null

until docker exec "${MYSQL_CONTAINER}" mysqladmin ping -h 127.0.0.1 -uroot --silent >/dev/null 2>&1; do
  if [[ "$(docker inspect -f '{{.State.Running}}' "${MYSQL_CONTAINER}" 2>/dev/null || true)" != 'true' ]]; then
    docker logs "${MYSQL_CONTAINER}" >&2 || true
    echo "Temporary MySQL container exited before it accepted TCP connections." >&2
    exit 1
  fi

  sleep 2
done

MYSQL_HOST="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${MYSQL_CONTAINER}")"
if [[ -z "${MYSQL_HOST}" ]]; then
  echo "Unable to determine the temporary MySQL container address." >&2
  exit 1
fi

cat > "${WORK_DIR}/load.load" <<EOF
LOAD DATABASE
  FROM mysql://root@${MYSQL_HOST}/fjcpc-teps
  INTO postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:${DB_PORT}/${DB_NAME}

  WITH data only, reset sequences, workers = 2, concurrency = 1

  EXCLUDING TABLE NAMES MATCHING ~/tokens/

  ALTER SCHEMA 'fjcpc-teps' RENAME TO 'public'
;
EOF

docker run --rm --platform linux/amd64 --network "${NETWORK_NAME}" \
  -v "${WORK_DIR}/load.load:/load.load:ro" \
  --add-host=host.docker.internal:host-gateway \
  dimitri/pgloader:latest pgloader /load.load

EXPECTED_COUNTS=(
  done_questions:75127
  login_key:9
  questions:2202
  request_info:2
  request_log:71
  star_questions:16233
  tokens:0
  updated_questions:42
  user_settings:86
  users:94
)

for item in "${EXPECTED_COUNTS[@]}"; do
  table="${item%%:*}"
  expected="${item##*:}"
  actual="$(docker exec "${POSTGRES_CONTAINER}" psql -U postgres -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM \"${table}\"")"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "${table}: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
done

OUTPUT_FILE="${BACKUP_FILE%.zip}_postgresql.sql"
docker exec -e "PGPASSWORD=${DB_PASSWORD}" "${POSTGRES_CONTAINER}" \
  pg_dump -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges > "${OUTPUT_FILE}"

echo "Import complete. PostgreSQL backup: ${OUTPUT_FILE}"
