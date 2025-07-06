"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProducts = void 0;
exports.createProduct = createProduct;
exports.getProducts = getProducts;
exports.getProduct = getProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getProductByBarcode = getProductByBarcode;
exports.createFullProductFlow = createFullProductFlow;
const client_1 = __importDefault(require("../prisma/client"));
const product_schema_1 = require("../schemas/product.schema");
const productType_schema_1 = require("../schemas/productType.schema");
const presentation_schema_1 = require("../schemas/presentation.schema");
const inventory_schema_1 = require("../schemas/inventory.schema");
async function createProduct(req, res) {
    console.log("Body recibido:", req.body);
    try {
        const { name, barCode, productTypeId, companyId, presentation, initialQuantity, } = req.body;
        if (!name ||
            !productTypeId ||
            !companyId ||
            !presentation.price ||
            !initialQuantity) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        const product = await client_1.default.product.create({
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
        await client_1.default.transaction.create({
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
    }
    catch (e) {
        console.error("Error en createProduct:", e);
        if (e.code === "P2002" && e.meta?.target?.includes("barCode")) {
            return res.status(400).json({ error: "El código de barra ya existe" });
        }
        return res
            .status(500)
            .json({ error: "Internal server error", details: e.message });
    }
}
async function getProducts(req, res) {
    try {
        const products = await client_1.default.product.findMany({
            include: {
                productType: true,
                presentations: true,
                inventories: true, // No incluir transactions
            },
        });
        const productsWithStringId = products.map((p) => ({ ...p, id: p.id.toString() }));
        return res.json(productsWithStringId);
    }
    catch (e) {
        console.error('Error en getProducts:', e);
        return res.status(500).json({ error: 'Internal server error', details: e.message });
    }
}
async function getProduct(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const product = await client_1.default.product.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        return res.json({ ...product, id: product.id.toString() });
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateProduct(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    const result = product_schema_1.updateProductSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        // Actualiza el producto (campos simples)
        const product = await client_1.default.product.update({ where: { id }, data: result.data });
        // Actualiza la presentación si viene en el body
        if (result.data.presentation && result.data.presentation.id) {
            await client_1.default.presentation.update({
                where: { id: result.data.presentation.id },
                data: {
                    price: result.data.presentation.price,
                    description: result.data.presentation.description,
                    unitLabel: result.data.presentation.unitLabel,
                },
            });
        }
        // Actualiza el inventario si viene en el body
        if (result.data.inventory && result.data.inventory.id) {
            await client_1.default.inventory.update({
                where: { id: result.data.inventory.id },
                data: {
                    quantity: result.data.inventory.quantity,
                },
            });
        }
        // Devuelve el producto actualizado con relaciones
        const updated = await client_1.default.product.findUnique({
            where: { id },
            include: {
                productType: true,
                presentations: true,
                inventories: true,
            },
        });
        // Devuelve el producto actualizado con relaciones
        if (!updated)
            return res.status(404).json({ error: 'Producto no encontrado tras actualizar' });
        return res.json({ ...updated, id: updated.id.toString() });
    }
    catch (e) {
        if (e.code === 'P2002' && e.meta?.target?.includes('barCode')) {
            return res.status(400).json({ error: 'El código de barra ya existe' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteProduct(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        await client_1.default.presentation.deleteMany({
            where: { productId: id },
        });
        await client_1.default.inventory.deleteMany({
            where: { productId: id },
        });
        await client_1.default.transaction.deleteMany({
            where: { productId: id },
        });
        await client_1.default.product.delete({
            where: { id },
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error al eliminar producto:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}
async function getProductByBarcode(req, res) {
    // Permitir ambos: ?barCode=... y ?barcode=... para compatibilidad
    const barCode = (req.query.barCode || req.query.barcode);
    if (!barCode)
        return res.status(400).json({ error: 'Barcode is required' });
    try {
        const product = await client_1.default.product.findUnique({ where: { barCode } });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        return res.json({ ...product, id: product.id.toString() });
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function createFullProductFlow(req, res) {
    // Recibe un JSON anidado con productType, product, presentation, inventory
    const { productType, product, presentation, inventory } = req.body;
    // Validar cada parte
    const ptResult = productType_schema_1.createProductTypeSchema.safeParse(productType);
    if (!ptResult.success)
        return res.status(400).json({ error: ptResult.error.format(), step: 'productType' });
    const prodResult = product_schema_1.createProductSchema.safeParse({ ...product, productTypeId: 0 }); // productTypeId se setea luego
    if (!prodResult.success)
        return res.status(400).json({ error: prodResult.error.format(), step: 'product' });
    const presResult = presentation_schema_1.createPresentationSchema.safeParse({ ...presentation, productId: 0 });
    if (!presResult.success)
        return res.status(400).json({ error: presResult.error.format(), step: 'presentation' });
    const invResult = inventory_schema_1.createInventorySchema.safeParse({ ...inventory, productId: 0 });
    if (!invResult.success)
        return res.status(400).json({ error: invResult.error.format(), step: 'inventory' });
    try {
        // 1. Crear ProductType (o buscar si existe)
        let pt = await client_1.default.productType.findFirst({ where: { name: productType.name } });
        if (!pt)
            pt = await client_1.default.productType.create({ data: productType });
        // 2. Crear Product
        const prod = await client_1.default.product.create({ data: { ...product, productTypeId: pt.id } });
        // 3. Crear Presentation
        const pres = await client_1.default.presentation.create({ data: { ...presentation, productId: prod.id } });
        // 4. Crear Inventory
        const inv = await client_1.default.inventory.create({ data: { ...inventory, productId: prod.id } });
        return res.status(201).json({ productType: pt, product: prod, presentation: pres, inventory: inv });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error', details: (e instanceof Error ? e.message : String(e)) });
    }
}
// Ejemplo de uso multiempresa en un controlador:
const getAllProducts = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const products = await client_1.default.product.findMany({ where: { companyId: companyId ? companyId : undefined } });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: 'Error al obtener productos' });
    }
};
exports.getAllProducts = getAllProducts;
