"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWarehouse = createWarehouse;
exports.getWarehouses = getWarehouses;
exports.getWarehouse = getWarehouse;
exports.updateWarehouse = updateWarehouse;
exports.deleteWarehouse = deleteWarehouse;
const client_1 = __importDefault(require("../prisma/client"));
const warehouse_schema_1 = require("../schemas/warehouse.schema");
async function createWarehouse(req, res) {
    const result = warehouse_schema_1.createWarehouseSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    try {
        const warehouse = await client_1.default.warehouse.create({ data: result.data });
        return res.status(201).json(warehouse);
    }
    catch (error) {
        console.error('Error creating warehouse:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getWarehouses(req, res) {
    try {
        const warehouses = await client_1.default.warehouse.findMany();
        return res.json(warehouses);
    }
    catch (error) {
        console.error('Error fetching warehouses:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getWarehouse(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
        const warehouse = await client_1.default.warehouse.findUnique({ where: { id } });
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        return res.json(warehouse);
    }
    catch (error) {
        console.error('Error fetching warehouse:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateWarehouse(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = warehouse_schema_1.updateWarehouseSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    try {
        const warehouse = await client_1.default.warehouse.update({
            where: { id },
            data: result.data
        });
        return res.json(warehouse);
    }
    catch (error) {
        console.error('Error updating warehouse:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteWarehouse(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
        await client_1.default.warehouse.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting warehouse:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
