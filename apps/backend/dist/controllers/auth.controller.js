"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const register = async (req, res) => {
    try {
        const { companyName, username, password, name, email } = req.body;
        if (!companyName || !username || !password || !name || !email) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }
        // 1. Crear empresa
        const company = await client_1.default.company.create({
            data: { name: companyName }
        });
        // 2. Crear usuario admin asociado a la empresa
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await client_1.default.user.create({
            data: {
                username,
                password: hashedPassword,
                name,
                email,
                companyId: company.id
            }
        });
        // 3. Generar JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), companyId: company.id.toString() }, JWT_SECRET, { expiresIn: '1d' });
        // Serializar BigInt a string en la respuesta
        res.status(201).json({
            token,
            user: { ...user, id: user.id.toString(), companyId: user.companyId?.toString() },
            company: { ...company, id: company.id.toString() }
        });
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Usuario o empresa ya existe' });
        }
        res.status(500).json({ message: 'Error en el registro', error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await client_1.default.user.findUnique({ where: { username }, include: { company: true } });
        if (!user || !user.password)
            return res.status(401).json({ message: 'Credenciales inválidas' });
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ message: 'Credenciales inválidas' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), companyId: user.companyId?.toString() }, JWT_SECRET, { expiresIn: '1d' });
        // Serializar recursivamente todos los BigInt y Date
        function deepSerialize(obj) {
            if (obj === null || obj === undefined)
                return obj;
            if (typeof obj === 'bigint')
                return obj.toString();
            if (obj instanceof Date)
                return obj.toISOString();
            if (Array.isArray(obj))
                return obj.map(deepSerialize);
            if (typeof obj === 'object') {
                return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepSerialize(v)]));
            }
            return obj;
        }
        res.json({
            token,
            user: deepSerialize(user),
            company: deepSerialize(user.company)
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error en el login', error: error.message });
    }
};
exports.login = login;
