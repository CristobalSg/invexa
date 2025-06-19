"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    barCode: zod_1.z.string().min(1).optional(),
    productTypeId: zod_1.z.number(),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    barCode: zod_1.z.string().min(1).optional(),
    productTypeId: zod_1.z.number().optional(),
});
