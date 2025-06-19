"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductType = createProductType;
exports.getProductTypes = getProductTypes;
exports.getProductType = getProductType;
exports.updateProductType = updateProductType;
exports.deleteProductType = deleteProductType;
const client_1 = __importDefault(require("../prisma/client"));
const productType_schema_1 = require("../schemas/productType.schema");
async function createProductType(req, res) {
    const result = productType_schema_1.createProductTypeSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const productType = await client_1.default.productType.create({ data: result.data });
        return res.status(201).json(productType);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getProductTypes(req, res) {
    try {
        const productTypes = await client_1.default.productType.findMany();
        return res.json(productTypes);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getProductType(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const productType = await client_1.default.productType.findUnique({ where: { id } });
        if (!productType)
            return res.status(404).json({ error: 'ProductType not found' });
        return res.json(productType);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateProductType(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    const result = productType_schema_1.updateProductTypeSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const productType = await client_1.default.productType.update({ where: { id }, data: result.data });
        return res.json(productType);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteProductType(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        await client_1.default.productType.delete({ where: { id } });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
