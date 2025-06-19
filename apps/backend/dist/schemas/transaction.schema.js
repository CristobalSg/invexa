"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionSchema = exports.createTransactionSchema = void 0;
const zod_1 = require("zod");
exports.createTransactionSchema = zod_1.z.object({
    productId: zod_1.z.number(),
    type: zod_1.z.enum(['SALE', 'WASTE', 'ADJUSTMENT', 'ENTRY']),
    quantity: zod_1.z.number().int().min(1),
    presentationId: zod_1.z.number().optional(),
    date: zod_1.z.string().datetime().optional()
});
exports.updateTransactionSchema = zod_1.z.object({
    type: zod_1.z.enum(['SALE', 'WASTE', 'ADJUSTMENT', 'ENTRY']).optional(),
    quantity: zod_1.z.number().int().min(1).optional(),
    presentationId: zod_1.z.number().optional(),
    date: zod_1.z.string().datetime().optional()
});
