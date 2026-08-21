# Invexa POS

Aplicación POS con backend Fastify + TypeScript + PostgreSQL y frontend React/Vite servido por Nginx en Docker. El backend no usa ORM: toda la persistencia es SQL puro sobre PostgreSQL.

## Servicios Docker

`docker-compose.yml` levanta:

- `api`: backend Fastify en `http://localhost:3000`
- `frontend`: app React en `http://localhost:5173`
- `postgres`: PostgreSQL en `localhost:5432`

La base usa volumen persistente `postgres_data`.

## Variables De Entorno

Copia el ejemplo si quieres personalizar valores:

```bash
cp .env.example .env
```

Dentro de Docker:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pos_db
VITE_API_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Fuera de Docker:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_db
VITE_API_URL=http://localhost:3000
```

No subas `.env` real. El `Dockerfile` y `.dockerignore` excluyen `.env` y `node_modules`.

## Comandos Docker

Levantar contenedores:

```bash
docker compose up -d
```

Levantar reconstruyendo imagen:

```bash
docker compose up --build
```

Abrir la aplicación:

```text
http://localhost:5173
```

API:

```text
http://localhost:3000
```

Ver logs del backend:

```bash
docker compose logs -f api
```

Ver logs del frontend:

```bash
docker compose logs -f frontend
```

Ver logs de PostgreSQL:

```bash
docker compose logs -f postgres
```

Entrar a PostgreSQL:

```bash
docker exec -it pos_postgres psql -U postgres -d pos_db
```

Ejecutar SQL inicial manualmente:

```bash
docker exec -i pos_postgres psql -U postgres -d pos_db < scripts/init.sql
```

Apagar contenedores:

```bash
docker compose down
```

Resetear base de datos y volumen:

```bash
docker compose down -v
docker compose up --build
```

Reconstruir imágenes:

```bash
docker compose build --no-cache
docker compose up -d
```

Reconstruir solo el frontend:

```bash
docker compose build frontend
docker compose up -d frontend
```

## Seed Inicial

PostgreSQL ejecuta `scripts/init.sql` al crear el volumen por primera vez. Ese script carga `backend/base.sql` con catalogos y datos base, pero no crea un administrador provisional.

En una instalacion nueva, abre el frontend y el sistema mostrara la pantalla para crear la cuenta administradora. La contraseña se ingresa dos veces y queda guardada como hash bcrypt. Esa misma contraseña del usuario administrador se usa despues para autorizar acciones restringidas cuando no estas operando con el perfil admin.

Tambien puedes crear el administrador inicial por API:

```bash
curl -X POST "$API_URL/auth/setup/admin" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_usuario": "admin",
    "nombre": "Administrador",
    "contraseña": "TU_CONTRASEÑA",
    "confirmar_contraseña": "TU_CONTRASEÑA",
    "nombre_dispositivo": "Caja POS"
  }'
```

## Pruebas Con Curl

Define la URL base:

```bash
export API_URL=http://localhost:3000
```

### 1. Healthcheck

```bash
curl "$API_URL/health"
```

### 2. Login

```bash
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_usuario": "admin",
    "contraseña": "TU_CONTRASEÑA"
  }'
```

Guardar token:

```bash
export TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"nombre_usuario":"admin","contraseña":"TU_CONTRASEÑA"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.token")
```

### 3. Crear Usuario

```bash
curl -X POST "$API_URL/usuarios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre_usuario": "cajero1",
    "contraseña": "123456",
    "nombre": "Cajero Uno",
    "email": "cajero1@example.com",
    "rol": "CASHIER"
  }'
```

### 4. Crear Categoría

```bash
curl -X POST "$API_URL/categorias" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre": "Lácteos",
    "multiplicador_ganancia": 1.35,
    "variacion_maxima_precio": 0.2
  }'
```

### 5. Crear Proveedor

```bash
curl -X POST "$API_URL/proveedores" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre": "Proveedor Sur",
    "telefono": "+56912345678",
    "porcentaje_comision": 12
  }'
```

### 6. Crear Producto

Usa una categoría existente del seed, por ejemplo `categoria_id: 3`.

```bash
curl -X POST "$API_URL/productos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre": "Leche entera 1L",
    "codigo_barras": "780000000001",
    "categoria_id": 3,
    "tipo_propiedad": "PROPIO",
    "costo_actual": 900,
    "precio_venta": 1200,
    "stock": 0
  }'
```

Para guardar el producto creado:

```bash
export PRODUCTO_ID=$(curl -s "$API_URL/productos/codigo/780000000001" \
  -H "Authorization: Bearer $TOKEN" \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.id")
```

### 7. Abrir Caja

```bash
curl -X POST "$API_URL/caja/abrir" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "monto_apertura": 50000
  }'
```

### 8. Registrar Compra

```bash
curl -X POST "$API_URL/compras" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"items\": [
      {
        \"producto_id\": $PRODUCTO_ID,
        \"cantidad\": 20,
        \"costo_unitario\": 900,
        \"precio_final\": 1300,
        \"actualizar_precio_venta\": true
      }
    ]
  }"
```

### 9. Crear Oferta

```bash
curl -X POST "$API_URL/ofertas" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"producto_id\": $PRODUCTO_ID,
    \"nombre\": \"Oferta leche\",
    \"precio_oferta\": 1100,
    \"motivo\": \"Promoción de prueba\"
  }"
```

### 10. Registrar Venta

```bash
curl -X POST "$API_URL/ventas" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"metodo_pago\": \"EFECTIVO\",
    \"descuento\": 0,
    \"items\": [
      {
        \"producto_id\": $PRODUCTO_ID,
        \"cantidad\": 2
      }
    ]
  }"
```

Guardar venta:

```bash
export VENTA_ID=$(curl -s "$API_URL/ventas?page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.items[0].id")
```

### 11. Listar Ventas

```bash
curl "$API_URL/ventas?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 12. Ver Movimientos De Inventario

```bash
curl "$API_URL/inventario/movimientos?page=1&limit=20&producto_id=$PRODUCTO_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 13. Anular Venta

```bash
curl -X PATCH "$API_URL/ventas/$VENTA_ID/anular" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "motivo": "Prueba de anulación"
  }'
```

### 14. Cerrar Caja

```bash
curl -X POST "$API_URL/caja/cerrar" \
  -H "Authorization: Bearer $TOKEN"
```

### 15. Consultar Reportes

Resumen de ventas:

```bash
curl "$API_URL/reportes/ventas/resumen" \
  -H "Authorization: Bearer $TOKEN"
```

Ventas mensuales:

```bash
curl "$API_URL/reportes/ventas/mensual" \
  -H "Authorization: Bearer $TOKEN"
```

Top productos:

```bash
curl "$API_URL/reportes/productos/top?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Inventario:

```bash
curl "$API_URL/reportes/inventario?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Bajo stock:

```bash
curl "$API_URL/reportes/bajo-stock?umbral=5&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Consignación:

```bash
curl "$API_URL/reportes/consignacion?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Reporte por producto:

```bash
curl "$API_URL/reportes/producto/$PRODUCTO_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Desarrollo Local Sin Docker

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm --filter backend dev
```

Asegúrate de usar:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_db
```

## Producción Simple

Para una ejecución simple de producción:

```bash
docker compose up --build -d
```

Recomendaciones mínimas:

- Cambia `JWT_SECRET`.
- Usa una contraseña real para PostgreSQL.
- Restringe `CORS_ORIGIN`.
- Mantén `RATE_LIMIT_MAX` acorde al tráfico.
- No publiques `.env`.
