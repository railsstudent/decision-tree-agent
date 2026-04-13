import { FunctionTool, LlmAgent, SingleBeforeModelCallback } from '@google/adk';
import { createAfterToolCallback } from './callbacks/after-tool-retry-callback.js';
import { agentEndCallback, agentStartCallback } from './callbacks/performance-callback.js';
import { DECISION_KEY } from './output-keys.const.js';
import { generateDecisionPrompt } from './prompts/decision.prompt.js';
import { decisionSchema } from './types/index.js';
import { generateFailedStateKey, getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const failedKey = generateFailedStateKey(DECISION_KEY);

const decisionAfterToolCallback = createAfterToolCallback(
  `STOP processing immediately and output the final JSON schema with verdict: "None".`,
  DECISION_KEY,
);

export const validateDecisionTool = new FunctionTool({
  name: 'validate_decision',
  description: 'Validates the LLM-generated verdict to ensure it is not None. Returns SUCCESS or an ERROR message.',
  parameters: decisionSchema,
  execute: async ({ verdict, nodes }) => {
    if (verdict === 'None') {
      return {
        status: 'ERROR',
        message:
          "You failed to traverse the decision tree. You must select a valid architecture. Do not output 'None'.",
      };
    }

    return {
      status: 'SUCCESS',
      finalizedData: { verdict, nodes },
      message: 'Verdict is valid. You may now generate the final output schema and finish.',
    };
  },
});

const beforeModelCallback: SingleBeforeModelCallback = async ({ context }) => {
  if (context?.state?.get(failedKey)) {
    console.log('Validation permanently failed. Terminating agent with fallback data.');
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify({ verdict: 'None', nodes: [] }),
          },
        ],
      },
    };
  }

  // If we already have a valid decision (e.g., from a previous loop iteration), stop the loop.
  const { decision } = getEvaluationContext(context);

  console.log(`beforeModelCallback: Agent ${context.agentName} validated verdict is None before calling LLM.`);

  if (decision && decision.verdict !== 'None') {
    return {
      content: {
        role: 'model',
        parts: [
          {
            text: JSON.stringify(decision),
          },
        ],
      },
    };
  }

  const { project, antiPatterns } = getEvaluationContext(context);
  const { isCompleted } = isProjectDetailsFilled(project);

  if (isCompleted && antiPatterns) {
    return undefined;
  }

  // Short-circuit if project is incomplete, and escalate to break the loop.
  // context.actions.escalate = true;
  return {
    content: {
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            verdict: 'None',
            nodes: [],
          }),
        },
      ],
    },
  };
};

export function createDecisionTreeAgent(model: string) {
  const decisionTreeAgent = new LlmAgent({
    name: 'DecisionTreeAgent',
    model,
    description:
      'Evaluates the structured project components against the Agent Fundamentals decision tree to determine the optimal architectural solution (e.g., Use Agent, Use LLM, Use Workflow Automation, or Use Simple API).',
    beforeAgentCallback: agentStartCallback(failedKey),
    beforeModelCallback,
    instruction: (context) => {
      const { project, antiPatterns } = getEvaluationContext(context);
      const { isCompleted } = isProjectDetailsFilled(project);
      if (project && isCompleted && antiPatterns) {
        return generateDecisionPrompt(project);
      }

      return 'Skipping LLM due to incomplete INTENT data.';
    },
    afterToolCallback: decisionAfterToolCallback,
    afterAgentCallback: agentEndCallback,
    tools: [validateDecisionTool],
    outputSchema: decisionSchema,
    outputKey: DECISION_KEY,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });

  return decisionTreeAgent;
}
