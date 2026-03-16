import { FunctionTool, LlmAgent, ParallelAgent } from '@google/adk';
import { z } from 'zod';
import {
    ANTI_PATTERNS_KEY,
    AUDIT_TRAIL_KEY,
    CLOUD_STORAGE_KEY,
    DECISION_KEY,
    INTENT_KEY,
    REPORT_KEY,
} from './output_keys.js';
import { auditTrailSchema, cloudStorageSchema } from './types/merger.type.js';

export const auditTrailTool = new FunctionTool({
    name: 'write_audit_trail',
    description: 'Audit the user intent, anti-patterns and decision of the evaluation',
    execute: async (_, context) => {
        const timestamp = await new Promise<string>((resolve) =>
            setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
        );
        console.log('write_audit_trail timestamp', timestamp);

        if (!context || !context.state) {
            return {
                status: 'error',
                timestamp,
                intent: null,
                antiPatterns: null,
                decision: null,
            };
        }
        const intent = context?.state.get(INTENT_KEY);
        const antiPatterns = context?.state.get(ANTI_PATTERNS_KEY);
        const decision = context?.state.get(DECISION_KEY);

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
    parameters: z.object({}),
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
