"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductTypeSchema = exports.createProductTypeSchema = void 0;
const zod_1 = require("zod");
exports.createProductTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1)
});
exports.updateProductTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional()
});
