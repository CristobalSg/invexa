import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createProductSchema, updateProductSchema } from '../schemas/product.schema'
import { createProductTypeSchema } from '../schemas/productType.schema'
import { createPresentationSchema } from '../schemas/presentation.schema'
import { createInventorySchema } from '../schemas/inventory.schema'
import { createTransactionSchema } from '../schemas/transaction.schema'
import { AuthRequest } from './auth.middleware';
import { log } from 'console'

export async function createProduct(req: Request, res: Response) {
    console.log("Body recibido:", req.body)

   try {
    const {
      name,
      barCode,
      productTypeId,
      companyId,
      presentation,
      initialQuantity,
    } = req.body;

    if (
      !name ||
      !productTypeId ||
      !companyId ||
      !presentation.price ||
      !initialQuantity
    ) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        barCode,
        productTypeId,
        companyId: companyId,
        presentations: {
          create: {
            price: presentation.price,
            ...(presentation.unitLabel && { unitLabel: presentation.unitLabel }),
            ...(presentation.description && { description: presentation.description }),
          },
        },
        inventories: {
          create: {
            quantity: initialQuantity,
            companyId: companyId,
          },
        },
      },
      include: {
        presentations: true,
        inventories: true,
      },
    });

    // Crear movimiento ENTRY (usa la primera presentación e inventario)
    await prisma.transaction.create({
      data: {
        productId: product.id,
        type: "ENTRY",
        quantity: initialQuantity,
        presentationId: product.presentations[0].id,
      },
    });

    return res.status(201).json({
      ...product,
      id: product.id.toString(),
    });
  } catch (e: any) {
    console.error("Error en createProduct:", e);
    if (e.code === "P2002" && e.meta?.target?.includes("barCode")) {
      return res.status(400).json({ error: "El código de barra ya existe" });
    }
    return res
      .status(500)
      .json({ error: "Internal server error", details: e.message });
  }
}


export async function getProducts(req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({
      include: {
        productType: true,
        presentations: true,
        inventories: true, // No incluir transactions
      },
    })
    const productsWithStringId = products.map((p) => ({ ...p, id: p.id.toString() }))
    return res.json(productsWithStringId)
  } catch (e: any) {
    console.error('Error en getProducts:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}

export async function getProduct(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    return res.json({ ...product, id: product.id.toString() })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { name, barCode, productTypeId, initialQuantity, presentation } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        barCode,
        productTypeId,
      },
    });

    // Actualizar inventario
    await prisma.inventory.updateMany({
      where: { productId: id },
      data: {
        quantity: initialQuantity,
      },
    });

    // Actualizar presentación
    await prisma.presentation.updateMany({
      where: { productId: id },
      data: {
        price: presentation?.price,
        unitLabel: presentation?.unitLabel,
        description: presentation?.description,
      },
    });

    return res.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2002" && e.meta?.target?.includes("barCode")) {
      return res.status(400).json({ error: "El código de barra ya existe" });
    }
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function deleteProduct(req: Request, res: Response) {
  try {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  await prisma.presentation.deleteMany({
    where: { productId: id },
  });

  await prisma.inventory.deleteMany({
    where: { productId: id },
  });

  await prisma.transaction.deleteMany({
    where: { productId: id },
  });

  await prisma.product.delete({
    where: { id },
  });

  return res.status(204).send();
} catch (error) {
  console.error("Error al eliminar producto:", error);
  return res.status(500).json({ error: "Error interno del servidor" });
}

}

export async function getProductByBarcode(req: Request, res: Response) {
  // Permitir ambos: ?barCode=... y ?barcode=... para compatibilidad
  const barCode = (req.query.barCode || req.query.barcode) as string
  if (!barCode) return res.status(400).json({ error: 'Barcode is required' })

  try {
    const product = await prisma.product.findUnique({ where: { barCode } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    return res.json({ ...product, id: product.id.toString() })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function createFullProductFlow(req: Request, res: Response) {
  // Recibe un JSON anidado con productType, product, presentation, inventory
  const { productType, product, presentation, inventory } = req.body;

  // Validar cada parte
  const ptResult = createProductTypeSchema.safeParse(productType);
  if (!ptResult.success) return res.status(400).json({ error: ptResult.error.format(), step: 'productType' });

  const prodResult = createProductSchema.safeParse({ ...product, productTypeId: 0 }); // productTypeId se setea luego
  if (!prodResult.success) return res.status(400).json({ error: prodResult.error.format(), step: 'product' });

  const presResult = createPresentationSchema.safeParse({ ...presentation, productId: 0 });
  if (!presResult.success) return res.status(400).json({ error: presResult.error.format(), step: 'presentation' });

  const invResult = createInventorySchema.safeParse({ ...inventory, productId: 0 });
  if (!invResult.success) return res.status(400).json({ error: invResult.error.format(), step: 'inventory' });

  try {
    // 1. Crear ProductType (o buscar si existe)
    let pt = await prisma.productType.findFirst({ where: { name: productType.name } });
    if (!pt) pt = await prisma.productType.create({ data: productType });

    // 2. Crear Product
    const prod = await prisma.product.create({ data: { ...product, productTypeId: pt.id } });

    // 3. Crear Presentation
    const pres = await prisma.presentation.create({ data: { ...presentation, productId: prod.id } });

    // 4. Crear Inventory
    const inv = await prisma.inventory.create({ data: { ...inventory, productId: prod.id } });

    return res.status(201).json({ productType: pt, product: prod, presentation: pres, inventory: inv });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error', details: (e instanceof Error ? e.message : String(e)) });
  }
}

// Ejemplo de uso multiempresa en un controlador:
export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const products = await prisma.product.findMany({ where: { companyId: companyId ? companyId : undefined } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};
