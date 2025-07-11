"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    roleId: zod_1.z.number().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(1).optional(),
    password: zod_1.z.string().min(6).optional(),
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    roleId: zod_1.z.number().optional(),
});
