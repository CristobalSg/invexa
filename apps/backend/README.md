# Invexa Backend

Backend del proyecto Invexa, construido con:

- **Node.js + Express**: API REST escalable.
- **TypeScript**: Tipado estático en tiempo de desarrollo.
- **Prisma ORM**: ORM moderno para trabajar con PostgreSQL.
- **PostgreSQL**: Base de datos relacional.
- **Zod**: Validación de datos.
- **Helmet**: Seguridad en cabeceras HTTP.

---

## 🚀 Requisitos

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [PostgreSQL](https://www.postgresql.org/) >= 14
- (Opcional) [Docker](https://www.docker.com/) si prefieres evitar instalaciones locales

---

## 🛠 Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/invexa.git
cd invexa/apps/backend
```

2. Instala dependencias:

```bash
pnpm install
```

3. Crea un archivo `.env` en la raíz de `apps/backend`:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/tu_base_de_datos"
PORT=3000
```

4. Ejecuta migraciones:

```bash
npx prisma migrate dev --name init
```

5. (Opcional) Genera cliente Prisma:

```bash
npx prisma generate
```

---

## 🧪 Scripts disponibles

| Comando         | Descripción                     |
|----------------|---------------------------------|
| `pnpm dev`      | Levanta el servidor en desarrollo (`ts-node-dev`) |
| `pnpm build`    | Compila TypeScript a JavaScript |
| `pnpm start`    | Ejecuta el build (ideal para producción) |

---

## 📦 Estructura de carpetas

```
apps/backend/
│
├── prisma/              # Schema de Prisma y migraciones
├── src/
│   ├── controllers/     # Controladores de Express
│   ├── routes/          # Rutas de la API
│   ├── schemas/         # Esquemas de validación con Zod
│   ├── prisma/          # Cliente Prisma
│   └── index.ts         # Punto de entrada del servidor
```

---

## 📬 Rutas disponibles

### `POST /api/users`

Crea un nuevo usuario  
```json
{
  "name": "Juan",
  "email": "juan@example.com"
}
```

### `GET /api/users`

Obtiene todos los usuarios

---

## 📦 Despliegue

Este backend puede desplegarse fácilmente en:

- Railway
- Render
- Docker

---

## 🧠 Notas

- Usa Zod para validar datos de entrada.
- Usa Helmet para mejorar seguridad por cabeceras HTTP.
- Usa Prisma para una integración tipada con PostgreSQL.
