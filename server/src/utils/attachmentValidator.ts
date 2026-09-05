export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface AttachmentValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates attachment file type and size against Lab 2 specification (BR-14, BR-15, AC-05)
 */
export function validateAttachment(file: { mimetype?: string; size?: number }): AttachmentValidationResult {
    if (!file || !file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'Invalid file type. Allowed formats: JPG, PNG, WEBP, PDF.',
        };
    }

    if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: 'File size exceeds the 5MB limit.',
        };
    }

    return { valid: true };
}
