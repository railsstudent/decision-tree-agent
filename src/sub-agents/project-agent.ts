import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
import { PROJECT_KEY } from './output-keys.const.js';
import { generateProjectBreakdownPrompt } from './prompts/project.prompt.js';
import { projectSchema } from './types/index.js';
import { generateFailedStateKey, getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const failedKey = generateFailedStateKey(PROJECT_KEY);

const projectAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately. Max validation attempts reached. Return the most accurate data found so far or empty strings if none.`,
  PROJECT_KEY,
);

export const validateProjectTool = new FunctionTool({
  name: 'validate_project',
  description:
    'Validates the LLM-generated task, problem, goal, and constraint to ensure they are not blank. Returns SUCCESS or an ERROR message.',
  parameters: projectSchema,
  execute: async ({ task, problem, goal, constraint }) => {
    let missingFieldMessage: string | null = null;
    if (!task) {
      missingFieldMessage =
        "Missing 'task'. Please provide a concise description of the specific action to be performed.";
    } else if (!problem) {
      missingFieldMessage = "Missing 'problem'. Please describe the underlying issue or pain point.";
    } else if (!goal) {
      missingFieldMessage = "Missing 'goal'. Please specify the desired outcome or objective.";
    } else if (!constraint) {
      missingFieldMessage = "Missing 'constraint'. Please list any limitations, requirements, or boundaries.";
    }

    if (missingFieldMessage) {
      return {
        status: 'ERROR',
        message: missingFieldMessage,
      };
    }

    return {
      status: 'SUCCESS',
      finalizedData: { task, problem, goal, constraint },
      message: 'Project breakdown is successful, you can now return the final output schema and finish.',
    };
  },
});

const beforeModelCallback: SingleBeforeModelCallback = ({ context }) => {
  if (context?.state?.get(failedKey)) {
    console.log('Validation permanently failed. Terminating agent with fallback data.');
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({ task: '', problem: '', goal: '', constraint: '' }),
          },
        ],
      },
    };
  }

  // If we already have a valid project breakdown (e.g., from a previous loop iteration), stop the loop.
  const { project } = getEvaluationContext(context);
  const { isCompleted } = isProjectDetailsFilled(project);

  console.log(
    `beforeModelCallback: Agent ${context.agentName} validated any missing field in the project breakdown before calling LLM.`,
  );

  if (isCompleted) {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(project),
          },
        ],
      },
    };
  }

  return undefined;
};

export function createProjectAgent(model: string) {
  const projectAgent = new LlmAgent({
    name: 'ProjectAgent',
    model,
    description:
      'Analyzes the user-provided project description to extract and structure its core components, including the primary task, underlying problem, ultimate goal, and architectural constraints.',
    beforeAgentCallback: agentStartCallback(failedKey),
    beforeModelCallback,
    instruction: (context) => {
      const { projectDescription } = getEvaluationContext(context);
      if (!projectDescription) {
        return '';
      }

      return generateProjectBreakdownPrompt(projectDescription);
    },
    afterToolCallback: projectAfterToolCallback,
    afterAgentCallback: agentEndCallback,
    tools: [validateProjectTool],
    outputSchema: projectSchema,
    outputKey: PROJECT_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });

  return projectAgent;
}
