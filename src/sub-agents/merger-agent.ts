import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY, REPORT_KEY } from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema } from './types/merger.type.js';

export const mergerTool = new FunctionTool({
    name: 'merge_results',
    description: 'Audit the user intent, anti-patterns and decision of the evaluation',
    execute: async (_, context) => {
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
        );
        console.log('merge_results timestamp', timestamp);

        if (!context || !context.state) {
            const result = {
                auditTrail: null,
                report: '',
                cloudStorage: null,
            };
            console.log('merge_results result', result);
            return result;
        }
        const auditTrail = context?.state.get(AUDIT_TRAIL_KEY);
        const cloudStorage = context?.state.get(CLOUD_STORAGE_KEY);
        const report = context?.state.get(REPORT_KEY);

        const result = {
            auditTrail,
            report,
            cloudStorage,
        };

        console.log('merge_results result', result);
        return result;
    },
});

export function createMergerAgent(model: string) {
    return new LlmAgent({
        name: 'MergerAgent',
        model,
        description: `You are a merger agent. Extract the data from the session state, combine them and return the final JSON object matching the requested schema`,
        instruction: `
            You MUST call the 'merge_results' tool.
            Do NOT generate the final output without first calling the 'merge_results' tool and waiting for its response. Use the tool's result property to formulate your final JSON output.
        `,
        outputSchema: z.object({
            auditTrail: auditTrailSchema.nullable(),
            report: z.string(),
            cloudStorage: cloudStorageSchema.nullable(),
        }),
        outputKey: MERGED_RESULTS_KEY,
        tools: [mergerTool],
    });
}
