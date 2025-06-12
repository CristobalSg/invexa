"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.getProducts = getProducts;
exports.getProduct = getProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const client_1 = __importDefault(require("../prisma/client"));
const product_schema_1 = require("../schemas/product.schema");
async function createProduct(req, res) {
    const result = product_schema_1.createProductSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const product = await client_1.default.product.create({ data: result.data });
        return res.status(201).json(product);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getProducts(req, res) {
    try {
        const products = await client_1.default.product.findMany();
        return res.json(products);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
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
        return res.json(product);
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
        const product = await client_1.default.product.update({ where: { id }, data: result.data });
        return res.json(product);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteProduct(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        await client_1.default.product.delete({ where: { id } });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
