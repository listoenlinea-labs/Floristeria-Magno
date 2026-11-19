const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('imagen se respalda con SHA-256 y se restaura tras perderse', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'magno-images-'));
    process.env.UPLOADS_DIR = path.join(root, 'originales');
    process.env.UPLOADS_BACKUP_DIR = path.join(root, 'backup');
    const service = require('../src/services/image-storage.service');
    try {
        await service.initializeImageStorage();
        const filename = 'flor-prueba.webp';
        const content = Buffer.from('RIFF-IMAGEN-DE-PRUEBA-DE-REDUNDANCIA');
        const primary = path.join(process.env.UPLOADS_DIR, 'productos', filename);
        const backup = path.join(process.env.UPLOADS_BACKUP_DIR, 'productos', filename);
        await fs.writeFile(primary, content);
        const verified = await service.protectUploadedFile({ filename }, 'productos');
        assert.match(verified.sha256, /^[a-f0-9]{64}$/);
        assert.deepEqual(await fs.readFile(backup), content);
        await fs.unlink(primary);
        assert.equal(await service.restoreImageIfNeeded('productos', filename), true);
        assert.deepEqual(await fs.readFile(primary), content);
        await fs.writeFile(primary, 'truncado');
        assert.equal(await service.restoreImageIfNeeded('productos', filename), true);
        assert.deepEqual(await fs.readFile(primary), content);
        // Incluso una alteración del mismo tamaño debe detectarse por checksum.
        const corrupted = Buffer.from(content);
        corrupted[0] = corrupted[0] ^ 1;
        await fs.writeFile(primary, corrupted);
        await fs.utimes(primary, new Date(Date.now() - 10000), new Date(Date.now() - 10000));
        assert.equal(await service.restoreImageIfNeeded('productos', filename), true);
        assert.deepEqual(await fs.readFile(primary), content);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
        delete process.env.UPLOADS_DIR;
        delete process.env.UPLOADS_BACKUP_DIR;
    }
});
