import { FunctionTool, LlmAgent, ParallelAgent } from '@google/adk';
import crypto from 'node:crypto';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY, MERGED_RESULTS_KEY } from './output_keys.js';
import { generateMergerPrompt } from './prompts/merge.prompt.js';
import { auditTrailSchema, cloudStorageSchema, mergerSchema } from './types/index.js';
import { getAggregateContext, getEvaluationContext } from './utils.js';

const auditTrailTool = new FunctionTool({
  name: 'write_audit_trail',
  description:
    'Persists a structured audit record containing the user intent, detected anti-patterns, and final architectural decision to the system logs.',
  execute: async (_, context) => {
    const timestamp = await new Promise<string>((resolve) =>
      setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
    );
    console.log('write_audit_trail timestamp', timestamp);

    const { project, antiPatterns, decision } = getEvaluationContext(context);
    const status = project && antiPatterns && decision ? 'success' : 'error';
    const result = {
      status,
      timestamp,
      project,
      antiPatterns,
      decision,
    };

    console.log('write_audit_trail result', result);
    return result;
  },
});

function generateURL(text: string, timestamp: string) {
  const recommendationLen = text.length;
  return recommendationLen > 0 ? `https://example.com/recommendation-${recommendationLen}-${timestamp}.pdf` : '';
}

const cloudStorageTool = new FunctionTool({
  name: 'upload_report_to_cloud',
  description:
    'Generates a secure URL and uploads the final architectural recommendation report to cloud-based PDF storage.',
  execute: async (_, context) => {
    const { recommendation } = getEvaluationContext(context);
    const timestamp = await new Promise<string>((resolve) =>
      setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1500),
    );
    const result = {
      uuid: crypto.randomUUID(),
      status: 'success',
      timestamp,
      url: generateURL(recommendation?.text || '', timestamp),
    };

    console.log('upload_report_to_cloud result', result);
    return result;
  },
});

export function createAuditAndUploadAgents(model: string) {
  const auditAgent = new LlmAgent({
    name: 'AuditTrailAgent',
    model,
    description:
      'Validates and formats the evaluation session data into a structured audit record before persisting it to the system logs.',
    instruction: async (context) => {
      const { project: intent, antiPatterns, decision } = getEvaluationContext(context);
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
    description:
      'Manages the secure generation and upload of the final architectural recommendation report to cloud-based storage.',
    instruction: (context) => {
      const { recommendation } = getEvaluationContext(context);

      return `
                You MUST call the 'upload_report_to_cloud' tool.
                Do NOT generate the final output without first calling the 'upload_report_to_cloud' tool and waiting for its response.

                ### INPUT DATA (READ-ONLY)
                The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
                - RECOMMENDATION: ${JSON.stringify(recommendation)}

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
    description:
      'Orchestrates the concurrent execution of the audit logging and report storage sub-agents to optimize workflow latency.',
    subAgents: [auditAgent, cloudStorageAgent],
  });

  return parallelAuditReportAgent;
}

export function createMergerAgent(model: string) {
  return new LlmAgent({
    name: 'MergerAgent',
    model,
    description:
      'Aggregates the asynchronous results from the audit trail, cloud storage, and recommendation phases into a cohesive, schema-validated JSON response for the user.',
    instruction: (context) => {
      const { auditTrail, recommendation, cloudStorage } = getAggregateContext(context);
      return generateMergerPrompt(recommendation, auditTrail, cloudStorage);
    },
    outputSchema: mergerSchema,
    outputKey: MERGED_RESULTS_KEY,
  });
}
