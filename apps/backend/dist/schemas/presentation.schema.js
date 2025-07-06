"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePresentationSchema = exports.createPresentationSchema = void 0;
const zod_1 = require("zod");
exports.createPresentationSchema = zod_1.z.object({
    productId: zod_1.z.number(),
    description: zod_1.z.string().min(1),
    baseQuantity: zod_1.z.number().int().min(1),
    price: zod_1.z.number().min(0),
    unitLabel: zod_1.z.string().min(1),
    barCode: zod_1.z.string().optional()
});
exports.updatePresentationSchema = zod_1.z.object({
    description: zod_1.z.string().min(1).optional(),
    baseQuantity: zod_1.z.number().int().min(1).optional(),
    price: zod_1.z.number().min(0).optional(),
    unitLabel: zod_1.z.string().min(1).optional(),
    barCode: zod_1.z.string().optional()
});
