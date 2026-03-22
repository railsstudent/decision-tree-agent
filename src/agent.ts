import { FunctionTool, LlmAgent, SequentialAgent } from '@google/adk';
import { z } from 'zod';
import { createAuditAndUploadAgents, createMergerAgent } from './sub-agents/audit-and-upload-agent.js';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY } from './sub-agents/output_keys.js';
import { createRecommendationAgent } from './sub-agents/recommendation-agent.js';

process.loadEnvFile();

const model = process.env.GEMINI_MODEL_NAME || '';
if (!model) {
    throw new Error('GEMINI_MODEL_NAME is not set');
}

const injectStateTool = new FunctionTool({
    name: 'inject_test_state',
    description: 'Injects mock data into the session state for testing.',
    parameters: z.object({}),
    execute: async (_, context) => {
        if (!context) {
            return;
        }

        // We write directly to the session state that the downstream agents expect
        context?.state.set(INTENT_KEY, {
            task: 'test query',
            goal: 'test',
            problem: 'my problem',
            constraint: 'my constraint',
        });
        context?.state.set(ANTI_PATTERNS_KEY, {
            isChatbot: false,
            isSingleAPI: false,
            isHighVolume: false,
            isWorkflow: true,
            isSafetyCritical: false,
        });
        context?.state.set(DECISION_KEY, {
            verdict: 'Use Agent',
        });

        return { status: 'Mock data injected successfully.' };
    },
});

const betterMockSetupAgent = new LlmAgent({
    name: 'SetupAgent',
    model,
    instruction: `You are a test setup agent. You must call the 'inject_test_state' tool immediately, then say
    'Setup complete'.`,
    tools: [injectStateTool],
});

function createSubAgents(model: string) {
    return [createRecommendationAgent(model), createAuditAndUploadAgents(model), createMergerAgent(model)];
}

export const SequentialEvaluationAgent = new SequentialAgent({
    name: 'SequentialEvaluationAgent',
    subAgents: [betterMockSetupAgent, ...createSubAgents(model)],
    description: `Runs agents sequentially to establish the intent of the project,
     detect any anti-patterns, make a descision, write a recommendation report, 
     audit the values to reach the descision, upload the report to code, and merge the results to a JSON object
    `,
});

export const rootAgent = new LlmAgent({
    name: 'project_evaluation_agent',
    model,
    description: 'The orchestrator agent for the project evaluation.',
    instruction: `1. Immediately run the 'SequentialEvaluationAgent' agent to gather the output from the subagents. Do not ask the user for input.
    2. Return the final result in JSON format.
    `,
    subAgents: [SequentialEvaluationAgent],
});
