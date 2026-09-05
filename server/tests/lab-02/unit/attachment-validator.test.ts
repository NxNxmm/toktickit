import { describe, it, expect } from 'vitest';
import { validateAttachment, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../../src/utils/attachmentValidator.js';

describe('UNIT-02: Attachment Validator Helper (BR-14, BR-15, AC-05)', () => {
    it('should accept all valid MIME types within the size limit', () => {
        for (const mimetype of ALLOWED_MIME_TYPES) {
            const result = validateAttachment({ mimetype, size: 1024 * 1024 }); // 1MB
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        }
    });

    it('should accept file at exactly the 5MB boundary', () => {
        const result = validateAttachment({ mimetype: 'image/png', size: MAX_FILE_SIZE });
        expect(result.valid).toBe(true);
    });

    it('should reject file that exceeds 5MB size limit', () => {
        const result = validateAttachment({ mimetype: 'image/png', size: MAX_FILE_SIZE + 1 });
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/exceeds/i);
    });

    it('should reject invalid MIME types', () => {
        const invalidTypes = ['text/plain', 'application/zip', 'video/mp4', 'application/javascript'];
        for (const mimetype of invalidTypes) {
            const result = validateAttachment({ mimetype, size: 5000 });
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/invalid file type/i);
        }
    });

    it('should reject missing or undefined mimetype', () => {
        const result = validateAttachment({ size: 1000 });
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/invalid file type/i);
    });
});
