"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    cost: zod_1.z.number().int().nonnegative().default(0),
    price: zod_1.z.number().int().nonnegative().default(0),
    quantity: zod_1.z.number().int().nonnegative().default(0),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    cost: zod_1.z.number().int().nonnegative().optional(),
    price: zod_1.z.number().int().nonnegative().optional(),
    quantity: zod_1.z.number().int().nonnegative().optional(),
});
