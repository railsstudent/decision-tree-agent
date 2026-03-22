import { FunctionTool, LlmAgent, ParallelAgent } from '@google/adk';
import { z } from 'zod';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY, RECOMMENDATION_KEY } from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema, Recommendation, recommendationSchema } from './types/index.js';
import { getEvaluationContext } from './utils.js';
import crypto from 'node:crypto';

export const auditTrailTool = new FunctionTool({
    name: 'write_audit_trail',
    description: 'Audit the user intent, anti-patterns and decision of the evaluation',
    execute: async (_, context) => {
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
        );
        console.log('write_audit_trail timestamp', timestamp);

        const { intent, antiPatterns, decision } = getEvaluationContext(context);
        const status = intent && antiPatterns && decision ? 'success' : 'error';
        const result = {
            status,
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
        const { report } = getEvaluationContext(context);
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 3000),
        );
        const reportLength = report ? (report as Recommendation).text.length : 0;
        const status = reportLength > 0 ? 'success' : 'error';
        const url = status === 'success' ? `https://example.com/recommendation-${reportLength}-${timestamp}.pdf` : '';
        const uuid = crypto.randomUUID();
        const result = {
            uuid,
            status,
            timestamp,
            url,
        };

        console.log('upload_report_to_cloud result', result);
        return result;
    },
});

export function createAuditAndUploadAgents(model: string) {
    const auditAgent = new LlmAgent({
        name: 'AuditTrailAgent',
        model,
        description: 'Audit the intent, anti-patterns and decision of the evaluation.',
        instruction: async (context) => {
            const { intent, antiPatterns, decision } = getEvaluationContext(context);
            return `
                You MUST call the 'write_audit_trail' tool.
                Do NOT generate the final output without first calling the 'write_audit_trail' tool and waiting for its response. 
            
                ### INPUT DATA (READ-ONLY)
                The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
                - INTENT: ${JSON.stringify(intent)}
                - ANTI-PATTERNS: ${JSON.stringify(antiPatterns)}
                - DECISION: ${JSON.stringify(decision)}

                ### OUTPUT FORMAT
                - You MUST populate these exact values with the 'status' and 'timestamp' returned by the 'write_audit_trail' tool.
            `;
        },
        tools: [auditTrailTool],
        outputSchema: auditTrailSchema,
        outputKey: AUDIT_TRAIL_KEY,
    });

    const cloudStorageAgent = new LlmAgent({
        name: 'CloudStorageAgent',
        model,
        description: 'Upload the report to the cloud storage.',
        instruction: (context) => {
            const { report } = getEvaluationContext(context);

            return `
                You MUST call the 'upload_report_to_cloud' tool.
                Do NOT generate the final output without first calling the 'upload_report_to_cloud' tool and waiting for its response.

                ### INPUT DATA (READ-ONLY)
                The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
                - REPORT: ${JSON.stringify(report)}

                ### OUTPUT FORMAT
                - You MUST populate an object with 'status', 'url', 'uuid', and 'timestamp' returned by the 'upload_report_to_cloud' tool.
            `;
        },
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
                report: null,
                cloudStorage: null,
            };
            console.log('merge_results result', result);
            return result;
        }
        const auditTrail = context?.state.get(AUDIT_TRAIL_KEY) ?? null;
        const cloudStorage = context?.state.get(CLOUD_STORAGE_KEY) ?? null;
        const report = context?.state.get(RECOMMENDATION_KEY) ?? null;

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
            report: recommendationSchema.nullable(),
            cloudStorage: cloudStorageSchema.nullable(),
            timestamp: z.string(),
        }),
        outputKey: MERGED_RESULTS_KEY,
        tools: [mergerTool],
    });
}
