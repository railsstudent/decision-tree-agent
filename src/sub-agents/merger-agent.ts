import { LlmAgent } from '@google/adk';
import { z } from 'zod';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY, REPORT_KEY } from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema } from './types/merger.type.js';

export function createMergerAgent(model: string) {
    return new LlmAgent({
        name: 'MergerAgent',
        model,
        description: `You are a merger agent. Extract the '${AUDIT_TRAIL_KEY}', '${REPORT_KEY}', and '${CLOUD_STORAGE_KEY}' objects from the session
state. Combine them and return the final JSON object matching the requested schema`,
        instruction: ``,
        outputSchema: z.object({
            auditTrail: auditTrailSchema,
            report: z.string(),
            cloudStorage: cloudStorageSchema,
        }),
        outputKey: MERGED_RESULTS_KEY,
    });
}
