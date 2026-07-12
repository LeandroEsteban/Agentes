const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { AppError } = require('../../shared/errors');

const MAX_FILE_SIZE = Number(process.env.DOCUMENT_MAX_FILE_BYTES || 10 * 1024 * 1024);
const MIME_TYPES = new Set(['application/pdf', 'text/plain', 'text/csv', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const storageRoot = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documents'));

function invalid(message) { throw new AppError(400, 'INVALID_ATTACHMENT', message); }

function decodeBase64(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) invalid('El archivo debe ser base64 válido');
    const buffer = Buffer.from(value, 'base64');
    if (!buffer.length || Buffer.from(buffer).toString('base64') !== value) invalid('El archivo base64 no es canónico');
    return buffer;
}

function prepare(input) {
    if (!MIME_TYPES.has(input.mime_type)) invalid('Tipo MIME no permitido');
    const buffer = decodeBase64(input.content_base64);
    if (buffer.length > MAX_FILE_SIZE) invalid(`El archivo supera el máximo de ${MAX_FILE_SIZE} bytes`);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (input.checksum_sha256 && !crypto.timingSafeEqual(Buffer.from(checksum), Buffer.from(input.checksum_sha256.toLowerCase()))) invalid('El checksum SHA-256 no coincide');
    return { buffer, checksum, fileName: path.basename(input.file_name).replace(/[\\/\0]/g, '_') };
}

async function save(prepared) {
    await fs.mkdir(storageRoot, { recursive: true });
    const storedName = `${crypto.randomUUID()}-${prepared.fileName}`;
    const absolutePath = path.join(storageRoot, storedName);
    await fs.writeFile(absolutePath, prepared.buffer, { flag: 'wx', mode: 0o600 });
    return { absolutePath, storagePath: storedName, fileSize: prepared.buffer.length, checksum: prepared.checksum };
}

async function remove(storagePath) {
    if (!storagePath || path.dirname(path.resolve(storageRoot, storagePath)) !== storageRoot) return;
    await fs.unlink(path.resolve(storageRoot, storagePath)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}

function resolve(storagePath) {
    const absolutePath = path.resolve(storageRoot, storagePath);
    if (path.dirname(absolutePath) !== storageRoot) throw new AppError(500, 'INVALID_STORAGE_PATH', 'Ruta de almacenamiento inválida');
    return absolutePath;
}

module.exports = { prepare, save, remove, resolve, MAX_FILE_SIZE, MIME_TYPES };
