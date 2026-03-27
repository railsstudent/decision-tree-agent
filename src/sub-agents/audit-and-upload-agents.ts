import {
  BaseAgent,
  Event,
  FunctionTool,
  InvocationContext,
  LlmAgent,
  ParallelAgent,
  ReadonlyContext,
  createEvent,
  createEventActions,
} from '@google/adk';
import crypto from 'node:crypto';
import { AUDIT_TRAIL_KEY, CLOUD_STORAGE_KEY } from './output-keys.js';
import { cloudStorageSchema } from './types/index.js';
import { getEvaluationContext } from './utils.js';

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

class AuditTrailAgent extends BaseAgent {
  constructor() {
    super({
      name: 'AuditTrailAgent',
      subAgents: [],
      description:
        'Validates and formats the evaluation session data into a structured audit record before persisting it to the system logs.',
    });
  }

  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    for await (const event of this.runLiveImpl(context)) {
      yield event;
    }
  }

  protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
    const readonlyCtx = new ReadonlyContext(context);
    const { project, antiPatterns, decision } = getEvaluationContext(readonlyCtx);

    const timestamp = await new Promise<string>((resolve) =>
      setTimeout(() => resolve(new Date(Date.now()).toISOString()), 1000),
    );
    console.log('write_audit_trail timestamp', timestamp);

    const status = project && antiPatterns && decision ? 'success' : 'error';
    const result = {
      status,
      timestamp,
      project,
      antiPatterns,
      decision,
    };

    const branch = context.branch || '';
    console.log('context.branch', branch);

    yield createEvent({
      invocationId: context.invocationId,
      author: this.name,
      branch,
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(result),
          },
        ],
      },

      // Mutate the session state by assing a stateDelta
      actions: createEventActions({
        stateDelta: {
          [AUDIT_TRAIL_KEY]: result,
        },
      }),
    });
  }
}

export function createAuditAndUploadAgents(model: string) {
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
    subAgents: [new AuditTrailAgent(), cloudStorageAgent],
  });

  return parallelAuditReportAgent;
}
