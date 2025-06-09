
src/
├── components/
│   ├── InputForm.tsx        # Componente de formulario dinámico
│   ├── StatsPanel.tsx       # Componente para mostrar estadísticas
│   └── ProductList.tsx      # (si tienes o vas a tener lista de productos)
│   └── layout.tsx    
│   └── layout.tsx    
├── layouts/
│   └── MainLayout.tsx       # Proximamente se movera aqui el layout
├── pages/
│   └── Home.tsx         # Página principal
│   └── ProductList.tsx         # Futura implementación
├── App.tsx                  # Punto de entrada con enrutamiento
├── main.tsx                 # Renderizado principal
└── types/
    └── product.ts           # Tipado de productos u otras entidades



# Sistema de Inventario - PMV

Este proyecto es una plantilla mínima viable (PMV) de un sistema de inventario, desarrollado con:

- ✅ React + Vite
- ✅ TypeScript
- ✅ TailwindCSS
- ✅ React Hook Form + Zod (validaciones futuras)
- ✅ TanStack Query (integración con backend futura)

## Estructura

- `InputForm`: campo de entrada dinámico
- `StatsPanel`: muestra el total de ventas y botón para finalizar
- `MainLayout`: estructura base con navbar (opcionalmente con Flowbite o a medida)
- Página principal dividida en 2/3 (formulario + lista) y 1/3 (estadísticas)

## Objetivo

Crear una base funcional y flexible para iterar rápidamente el desarrollo del sistema.

---

## Cómo iniciar

```bash
pnpm install
pnpm dev
# React + TypeScript + Vite