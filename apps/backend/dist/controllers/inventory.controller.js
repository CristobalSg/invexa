"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllInventory = void 0;
exports.createInventory = createInventory;
exports.getInventory = getInventory;
exports.updateInventory = updateInventory;
exports.deleteInventory = deleteInventory;
exports.registerSale = registerSale;
const zod_1 = require("zod");
const client_1 = __importDefault(require("../prisma/client"));
const inventory_schema_1 = require("../schemas/inventory.schema");
async function createInventory(req, res) {
    const result = inventory_schema_1.createInventorySchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: 'No autorizado' });
        const inventory = await client_1.default.inventory.create({ data: { ...result.data, companyId: companyId } });
        return res.status(201).json(inventory);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
const getAllInventory = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: 'No autorizado' });
        const inventory = await client_1.default.inventory.findMany({ where: { companyId: companyId } });
        res.json(inventory);
    }
    catch (error) {
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};
exports.getAllInventory = getAllInventory;
async function getInventory(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: 'No autorizado' });
        const inventory = await client_1.default.inventory.findFirst({ where: { id, companyId: companyId } });
        if (!inventory)
            return res.status(404).json({ error: 'Inventory not found' });
        return res.json(inventory);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateInventory(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    const result = inventory_schema_1.updateInventorySchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: 'No autorizado' });
        const inventory = await client_1.default.inventory.updateMany({
            where: { id, companyId: companyId },
            data: result.data
        });
        if (inventory.count === 0)
            return res.status(404).json({ error: 'Inventory not found' });
        return res.json({ success: true });
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteInventory(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: 'No autorizado' });
        const deleted = await client_1.default.inventory.deleteMany({ where: { id, companyId: companyId } });
        if (deleted.count === 0)
            return res.status(404).json({ error: 'Inventory not found' });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
const registerSaleSchema = zod_1.z.object({
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.number(),
        quantity: zod_1.z.number().positive(),
    }))
        .nonempty(),
});
async function registerSale(req, res) {
    console.log("Body recibido:", req.body);
    const parsed = registerSaleSchema.safeParse(req.body);
    if (!parsed.success) {
        console.error("Error en schema:", parsed.error.format());
        return res.status(400).json({ error: parsed.error.format() });
    }
    const companyId = Number(req.user?.companyId);
    if (!companyId) {
        return res.status(401).json({ error: "No autorizado" });
    }
    try {
        const { items } = parsed.data;
        const updatedItems = await client_1.default.$transaction(items.map(({ productId, quantity }) => client_1.default.inventory.updateMany({
            where: { productId, companyId },
            data: {
                quantity: {
                    decrement: quantity,
                },
            },
        })));
        // Crear transacciones de tipo "SALE"
        await client_1.default.transaction.createMany({
            data: items.map(({ productId, quantity }) => ({
                type: "SALE",
                quantity,
                productId,
            })),
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error al registrar venta:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}
