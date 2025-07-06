"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    productTypeId: zod_1.z.number(),
    barCode: zod_1.z.string(),
    companyId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    // Anidar presentación
    presentation: zod_1.z.object({
        price: zod_1.z.number().positive(),
        description: zod_1.z.string().min(1).optional(),
        unitLabel: zod_1.z.string().min(1).optional(),
    }),
    // Cantidad inicial de inventario
    initialQuantity: zod_1.z.number().int().nonnegative(),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    barCode: zod_1.z.string().min(1).optional(),
    productTypeId: zod_1.z.number().optional(),
    // Permitir actualizar presentación e inventario
    presentation: zod_1.z.object({
        id: zod_1.z.number(),
        price: zod_1.z.number().positive().optional(),
        description: zod_1.z.string().optional(),
        unitLabel: zod_1.z.string().optional(),
    }).optional(),
    inventory: zod_1.z.object({
        id: zod_1.z.number(),
        quantity: zod_1.z.number().int().nonnegative().optional(),
    }).optional(),
});
