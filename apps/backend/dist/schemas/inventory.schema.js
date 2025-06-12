"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInventorySchema = exports.createInventorySchema = void 0;
const zod_1 = require("zod");
exports.createInventorySchema = zod_1.z.object({
    warehouseId: zod_1.z.bigint(),
    productId: zod_1.z.bigint(),
    quantity: zod_1.z.number().int().min(0),
});
exports.updateInventorySchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0).optional(),
});
