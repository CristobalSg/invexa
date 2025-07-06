"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPresentation = createPresentation;
exports.getPresentations = getPresentations;
exports.getPresentation = getPresentation;
exports.updatePresentation = updatePresentation;
exports.deletePresentation = deletePresentation;
const client_1 = __importDefault(require("../prisma/client"));
const presentation_schema_1 = require("../schemas/presentation.schema");
async function createPresentation(req, res) {
    const result = presentation_schema_1.createPresentationSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const presentation = await client_1.default.presentation.create({ data: result.data });
        return res.status(201).json(presentation);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getPresentations(req, res) {
    try {
        const presentations = await client_1.default.presentation.findMany();
        return res.json(presentations);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getPresentation(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        const presentation = await client_1.default.presentation.findUnique({ where: { id } });
        if (!presentation)
            return res.status(404).json({ error: 'Presentation not found' });
        return res.json(presentation);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updatePresentation(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    const result = presentation_schema_1.updatePresentationSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.format() });
    try {
        const presentation = await client_1.default.presentation.update({ where: { id }, data: result.data });
        return res.json(presentation);
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deletePresentation(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ error: 'Invalid ID' });
    try {
        await client_1.default.presentation.delete({ where: { id } });
        return res.status(204).send();
    }
    catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
