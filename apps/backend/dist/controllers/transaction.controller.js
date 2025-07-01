"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransaction = createTransaction;
exports.getTransactions = getTransactions;
exports.getTransaction = getTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
const client_1 = __importDefault(require("../prisma/client"));
const transaction_schema_1 = require("../schemas/transaction.schema");
async function createTransaction(req, res) {
    const result = transaction_schema_1.createTransactionSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const transaction = await client_1.default.transaction.create({ data: result.data });
        return res.status(201).json(transaction);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getTransactions(req, res) {
    try {
        const transactions = await client_1.default.transaction.findMany();
        return res.json(transactions);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getTransaction(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const transaction = await client_1.default.transaction.findUnique({ where: { id } });
        if (!transaction)
            return res.status(404).json({ error: 'Transaction not found' });
        return res.json(transaction);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateTransaction(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    const result = transaction_schema_1.updateTransactionSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const transaction = await client_1.default.transaction.update({ where: { id }, data: result.data });
        return res.json(transaction);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteTransaction(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        await client_1.default.transaction.delete({ where: { id } });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
