## Resumen de comandos

```bash
git pull
docker compose stop api frontend
docker compose up -d postgres
mkdir -p backups
docker compose exec -T postgres pg_dump -U postgres -d pos_db -Fc > backups/antes-pagos-venta.dump
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d pos_db < backend/migrations/20260910_pagos_venta.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U 
postgres -d pos_db < backend/scripts/verify-pagos-venta.sql
docker compose up -d --build api frontend
docker compose ps
curl http://localhost:3000/health
```

La migración es repetible: usa `IF NOT EXISTS` y evita duplicar pagos históricos. Aun así, siempre conviene respaldar primero.