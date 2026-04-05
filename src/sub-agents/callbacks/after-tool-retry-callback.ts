import { AfterToolCallback } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';
import { MAX_ITERATIONS } from '../validation.const.js';

export function createAfterToolCallback(fatalErrorMessage: string, maxAttempts = MAX_ITERATIONS): AfterToolCallback {
  return async ({ tool, context, response }) => {
    const toolName = tool.name;
    const agentName = context.agentName;
    const state = context.state;

    console.log(
      `afterToolCallback: Agent "${agentName}" executed tool "${toolName}" with response: ${JSON.stringify(response)}.`,
    );

    if (!response || typeof response !== 'object' || !('status' in response)) {
      return undefined;
    }

    let attempts = state.get<number>(VALIDATION_ATTEMPTS_KEY) || 0;
    attempts = attempts + 1;
    if (context) {
      state.set(VALIDATION_ATTEMPTS_KEY, attempts);
    }

    const status = response.status || 'ERROR';
    if (status === 'ERROR' && attempts >= maxAttempts) {
      console.log(`Max validation attempts reached (${attempts}). Forcing LLM to terminate.`);
      if (context) {
        // Break the internal LLM tool-calling loop
        context.actions.escalate = true;
      }
      return {
        status: 'FATAL_ERROR',
        message: fatalErrorMessage,
      };
    }

    // passing the original response
    return undefined;
  };
}
