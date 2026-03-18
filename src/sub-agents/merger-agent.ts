import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY, REPORT_KEY } from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema } from './types/merger.type.js';

export const mergerTool = new FunctionTool({
    name: 'merge_results',
    description: `Retrieves the previously generated audit trail, cloud storage details, and evaluation report from
     the current session state.`,
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
            timestamp,
        };

        console.log('merge_results result', result);
        return result;
    },
});

export function createMergerAgent(model: string) {
    return new LlmAgent({
        name: 'MergerAgent',
        model,
        description: `You are an aggregator agent. Your role is to collect the final evaluation results from
      previous steps and format them into a single, cohesive JSON response.`,
        instruction: `
            Your strict requirement is to call the 'merge_results' tool to retrieve the necessary data.
            Do NOT attempt to guess or generate the output yourself.
            Once you receive the response from the 'merge_results' tool, map its properties ('auditTrail', 'report',
      and 'cloudStorage') directly to your final JSON output schema without modifying their content.
        `,
        outputSchema: z.object({
            auditTrail: auditTrailSchema.nullable(),
            report: z.string(),
            cloudStorage: cloudStorageSchema.nullable(),
            timestamp: z.string(),
        }),
        outputKey: MERGED_RESULTS_KEY,
        tools: [mergerTool],
    });
}
