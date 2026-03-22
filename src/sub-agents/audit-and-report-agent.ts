import { FunctionTool, LlmAgent, ParallelAgent } from '@google/adk';
import { z } from 'zod';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY, REPORT_KEY } from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema } from './types/merger.type.js';
import { RecommendationReport } from './types/recommendation-report.type.js';
import { getEvaluationContext } from './utils.js';

export const auditTrailTool = new FunctionTool({
    name: 'write_audit_trail',
    description: 'Audit the user intent, anti-patterns and decision of the evaluation',
    execute: async (_, context) => {
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
        );
        console.log('write_audit_trail timestamp', timestamp);

        const evaluationContext = getEvaluationContext(context);
        const { intent, antiPatterns, decision } = evaluationContext;

        if (!intent && !antiPatterns && !decision) {
            return {
                status: 'error',
                timestamp,
                intent: null,
                antiPatterns: null,
                decision: null,
            };
        }

        console.log(intent, antiPatterns, decision);
        const result = {
            status: 'success',
            timestamp,
            intent,
            antiPatterns,
            decision,
        };

        console.log('write_audit_trail result', result);
        return result;
    },
});

export const cloudStorageTool = new FunctionTool({
    name: 'upload_report_to_cloud',
    description: 'Upload the recommendation report to the cloud storage',
    execute: async (_, context) => {
        const report = context?.state.get<string>(REPORT_KEY) || '';
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 2000),
        );
        console.log('report length', report.length, 'timestamp', timestamp);
        const result = {
            uuid: Date.now().toString(),
            status: 'success',
            timestamp,
            url: `https://example.com/recommendation-${report.length}-${timestamp}.pdf`,
        };

        console.log('upload_report_to_cloud result', result);
        return result;
    },
});

export function createAuditAndReportAgent(model: string) {
    const auditAgent = new LlmAgent({
        name: 'AuditTrailAgent',
        model,
        description: 'Audit the intent, anti-patterns and decision of the evaluation.',
        instruction: `
            You MUST call the 'write_audit_trail' tool.
            Do NOT generate the final output without first calling the 'write_audit_trail' tool and waiting for its response. Use the tool's result property to formulate your final JSON output.
        `,
        tools: [auditTrailTool],
        outputSchema: auditTrailSchema,
        outputKey: AUDIT_TRAIL_KEY,
    });

    const cloudStorageAgent = new LlmAgent({
        name: 'CloudStorageAgent',
        model,
        description: 'Upload the report to the cloud storage.',
        instruction: `
            You MUST call the 'upload_report_to_cloud' tool.
            Do NOT generate the final output without first calling the 'upload_report_to_cloud' tool and waiting for its response. Use the tool's result property to formulate your final JSON output.
        `,
        tools: [cloudStorageTool],
        outputSchema: cloudStorageSchema,
        outputKey: CLOUD_STORAGE_KEY,
    });

    const parallelAuditReportAgent = new ParallelAgent({
        name: 'ParallelAuditReportAgent',
        description: 'Run audit trail and cloud storage agents in parallel and write to session state.',
        subAgents: [auditAgent, cloudStorageAgent],
    });

    return parallelAuditReportAgent;
}

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
        const report = context?.state.get<RecommendationReport>(REPORT_KEY, { text: '' });

        const result = {
            auditTrail,
            report: report?.text,
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
