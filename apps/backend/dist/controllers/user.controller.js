"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.getUsers = getUsers;
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const client_1 = __importDefault(require("../prisma/client"));
const user_schema_1 = require("../schemas/user.schema");
async function createUser(req, res) {
    const result = user_schema_1.createUserSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    try {
        const user = await client_1.default.user.create({ data: result.data });
        // Convertir BigInt a string para serializar correctamente
        const userSerialized = {
            ...user,
            id: user.id.toString(),
            roleId: user.roleId ? user.roleId.toString() : undefined,
        };
        return res.status(201).json(userSerialized);
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(400).json({ error: 'El email ya existe' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getUsers(req, res) {
    try {
        const users = await client_1.default.user.findMany({ include: { role: true } });
        // Serializar BigInt y roleId correctamente
        const usersSerialized = users.map(user => ({
            ...user,
            id: user.id.toString(),
            roleId: user.roleId ? user.roleId.toString() : undefined,
            role: user.role || null,
        }));
        return res.json(usersSerialized);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getUser(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
        const user = await client_1.default.user.findUnique({
            where: { id },
            include: { role: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(user);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateUser(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = user_schema_1.updateUserSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    try {
        const user = await client_1.default.user.update({
            where: { id },
            data: result.data
        });
        // Convertir BigInt a string para serializar correctamente
        const userSerialized = {
            ...user,
            id: user.id.toString(),
            roleId: user.roleId ? user.roleId.toString() : undefined,
        };
        return res.json(userSerialized);
    }
    catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(400).json({ error: 'El email ya existe' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteUser(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
        await client_1.default.user.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
