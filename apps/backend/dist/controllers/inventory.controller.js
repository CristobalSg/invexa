"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventory = createInventory;
exports.getInventories = getInventories;
exports.getInventory = getInventory;
exports.updateInventory = updateInventory;
exports.deleteInventory = deleteInventory;
const client_1 = __importDefault(require("../prisma/client"));
const inventory_schema_1 = require("../schemas/inventory.schema");
async function createInventory(req, res) {
    const result = inventory_schema_1.createInventorySchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const inventory = await client_1.default.inventory.create({ data: result.data });
        return res.status(201).json(inventory);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getInventories(req, res) {
    try {
        const inventories = await client_1.default.inventory.findMany();
        return res.json(inventories);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getInventory(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const inventory = await client_1.default.inventory.findUnique({ where: { id } });
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
        const inventory = await client_1.default.inventory.update({ where: { id }, data: result.data });
        return res.json(inventory);
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
        await client_1.default.inventory.delete({ where: { id } });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
