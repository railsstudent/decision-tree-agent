import { FunctionTool, LlmAgent, SequentialAgent } from '@google/adk';
import { z } from 'zod';
import { createAuditAndUploadAgents, createMergerAgent } from './sub-agents/audit-and-upload-agents.js';
import { createDecisionTreeAgent } from './sub-agents/decision-agent.js';
import { createProjectAgent } from './sub-agents/project-agent.js';
import { ANTI_PATTERNS_KEY } from './sub-agents/output_keys.js';
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

        context?.state.set(ANTI_PATTERNS_KEY, {
            isChatbot: false,
            isSingleAPI: false,
            isHighVolume: false,
            isWorkflow: false,
            isSafetyCritical: false,
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
    return [
        createProjectAgent(model),
        betterMockSetupAgent,
        createDecisionTreeAgent(model),
        createRecommendationAgent(model),
        createAuditAndUploadAgents(model),
        createMergerAgent(model),
    ];
}

export const SequentialEvaluationAgent = new SequentialAgent({
    name: 'SequentialEvaluationAgent',
    subAgents: createSubAgents(model),
    description: `
        Receive the project description and runs the sub-agents sequentially to perform the following tasks:',
        Task Order:
            1. Break the description into core components: task, problem, goal, and constraint.
            2. Detect any anti-patterns in the description.
            3. Go through the decision tree to determine whether the description is a agent-shaped problem. 
            4. Generate recommendation. 
            5. Log the project components, anti-patterns, and decision to the system logs. 
            6. Upload the recommendation to a cloud storage.
            7. Merge the results to a JSON object.
    `,
});

export const rootAgent = new LlmAgent({
    name: 'project_evaluation_agent',
    model,
    description: 'The orchestrator agent for the project evaluation.',
    instruction: `
    1. Ask user to write a project description.
    2. Execute 'SequentialEvaluationAgent'.
    3. Return the final result in JSON format.
    `,
    subAgents: [SequentialEvaluationAgent],
});
