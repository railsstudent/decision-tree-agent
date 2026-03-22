import { z } from 'zod';
import { antiPatternsSchema, decisionSchema, userIntentSchema } from './evaluation.type.js';

export const auditTrailSchema = z.object({
    intent: userIntentSchema.nullable(),
    status: z.enum(['success', 'error']),
    timestamp: z.string(),
    decision: decisionSchema.nullable(),
    antiPatterns: antiPatternsSchema.nullable(),
});

export const cloudStorageSchema = z.object({
    uuid: z.string(),
    url: z.string().nullable(),
    status: z.enum(['success', 'error']),
    timestamp: z.string(),
});
