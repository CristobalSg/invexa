# Backend Rules and Architecture

## Objective

Build a complete production-ready backend for an inventory and POS system using:

- Fastify
- TypeScript
- PostgreSQL
- pg
- JWT
- bcrypt

The backend must be modular, scalable, clean, maintainable and fully functional.

--------------------------------------------------

## Mandatory Rules

- DO NOT use ORM.
- Use raw SQL only.
- Use PostgreSQL transactions for critical operations.
- Use strict TypeScript typing.
- Separate responsibilities clearly.
- Every module must contain:
  - routes
  - service
  - repository
  - schema
  - types
- Never place SQL directly inside routes.
- Never place business logic inside routes.
- All validations must be centralized.
- All errors must be centralized.
- Every protected route must validate JWT.
- Every role-restricted route must validate permissions.

--------------------------------------------------

## Required Architecture

src/

  app.ts
  server.ts

  config/
    env.ts
    db.ts

  plugins/
    postgres.plugin.ts
    jwt.plugin.ts

  middlewares/
    auth.middleware.ts
    role.middleware.ts

  utils/
    errors.ts
    responses.ts
    transactions.ts

  modules/

    auth/
      auth.routes.ts
      auth.service.ts
      auth.repository.ts
      auth.schema.ts
      auth.types.ts

    usuarios/
    productos/
    categorias/
    proveedores/
    compras/
    ventas/
    caja/
    ofertas/
    inventario/
    reportes/

--------------------------------------------------

## Database Rules

Existing PostgreSQL schema already exists and MUST be respected.

The backend MUST work with:

- usuarios
- productos
- categorias_producto
- proveedores
- compras
- detalle_compras
- ventas
- detalle_ventas
- movimientos_inventario
- ofertas_producto
- sesiones_caja

Never redesign the database unless explicitly required.

--------------------------------------------------

## Authentication Rules

Use JWT authentication.

Passwords must use bcrypt hashing.

Roles:

- OWNER
- CASHIER

OWNER permissions:

- manage users
- manage products
- manage reports
- annul sales
- manage inventory

CASHIER permissions:

- create sales
- open cash session
- close cash session
- read products

--------------------------------------------------

## API Standards

All endpoints must:

- validate request body
- validate params
- validate query params
- return standardized responses
- use proper HTTP status codes

Standard response format:

success:
  success: true
  data: ...

error:
  success: false
  message: ...

--------------------------------------------------

## Critical Transaction Rules

The following operations MUST use PostgreSQL transactions:

- create purchase
- create sale
- annul sale
- stock adjustment
- inventory loss
- returns

Example structure:

BEGIN

operation 1
operation 2
operation 3

COMMIT

On error:

ROLLBACK

--------------------------------------------------

## Inventory Rules

Stock can NEVER be modified without creating a movement record.

Every stock operation must create:

movimientos_inventario

Supported movement types:

- VENTA
- COMPRA
- AJUSTE
- MERMA
- DEVOLUCION
- ANULACION

--------------------------------------------------

## Product Rules

Rules:

- product must belong to category
- barcode must be unique
- stock cannot be negative
- inactive products cannot be sold
- consignation products must have provider

Consignation validation:

if tipo_propiedad = CONSIGNACION
then proveedor_id is required

--------------------------------------------------

## Sales Rules

Sale flow:

1. validate authenticated user
2. validate open cash session
3. validate stock
4. validate active product
5. detect active offer
6. create sale
7. create sale details
8. discount stock
9. create inventory movement
10. commit transaction

Important:

- store historical sale prices
- store provider information
- store product ownership type
- never depend on future product modifications

--------------------------------------------------

## Purchase Rules

Purchase flow:

1. create purchase
2. create detail rows
3. update stock
4. update current cost
5. optionally update sale price
6. create inventory movement
7. commit transaction

--------------------------------------------------

## Cash Session Rules

Rules:

- one user cannot have multiple open sessions
- every sale must belong to a cash session
- closing session must calculate totals
- support:
  - cash
  - card
  - transfer
  - mixed

--------------------------------------------------

## Offer Rules

Rules:

- offers belong to products
- offers are NOT separate products
- offers can expire
- offers must be validated before sale
- sales must preserve offer history

--------------------------------------------------

## Report Rules

Create endpoints for:

- daily sales
- monthly sales
- top selling products
- low stock products
- inventory history
- sales by product
- consignation reports
- profits estimation

--------------------------------------------------

## Security Rules

Mandatory:

- JWT validation
- password hashing
- request validation
- centralized error handling
- environment variables
- CORS
- rate limiting
- secure headers

--------------------------------------------------

## Code Quality Rules

Mandatory:

- reusable services
- reusable repositories
- avoid duplicated logic
- small functions
- readable code
- production-ready structure
- scalable architecture

--------------------------------------------------

## Forbidden

DO NOT:

- use ORM
- place SQL inside routes
- place business logic inside routes
- use any
- create giant files
- duplicate validation logic
- skip transactions
- modify stock outside inventory logic

--------------------------------------------------

## Final Objective

Deliver a fully functional backend where users can:

- authenticate
- manage products
- manage categories
- manage providers
- open cash sessions
- close cash sessions
- register purchases
- register sales
- apply offers
- annul sales
- track inventory
- view reports

The backend must be production-ready and scalable.