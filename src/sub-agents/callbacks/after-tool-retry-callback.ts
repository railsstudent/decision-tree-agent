import { SingleAfterToolCallback } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';
import { MAX_ITERATIONS } from '../validation.const.js';
import { generateFailedStateKey } from '../utils.js';

export function createAfterToolCallback(
  fatalErrorMessage: string,
  stateKey: string,
  maxAttempts = MAX_ITERATIONS,
): SingleAfterToolCallback {
  return ({ tool, context, response }) => {
    if (!tool || !context || !context.state) {
      return undefined;
    }

    const toolName = tool.name;
    const agentName = context.agentName;
    const state = context.state;

    console.log(
      `afterToolCallback: Agent "${agentName}" executed tool "${toolName}" with response: ${JSON.stringify(response)}.`,
    );

    if (!response || typeof response !== 'object' || !('status' in response)) {
      return undefined;
    }

    const attempts = (state.get<number>(VALIDATION_ATTEMPTS_KEY) || 0) + 1;
    state.set(VALIDATION_ATTEMPTS_KEY, attempts);

    const status = response.status || 'ERROR';
    const isUnsuccessful = status !== 'SUCCESS';

    if (isUnsuccessful && attempts >= maxAttempts) {
      console.log(`Max validation attempts reached (${attempts}). Forcing LLM to terminate.`);

      // Break the internal LLM tool-calling loop
      context.actions.escalate = true;
      const failedKey = generateFailedStateKey(stateKey);
      state.set(failedKey, true);

      return {
        status: 'FATAL_ERROR',
        message: fatalErrorMessage,
      };
    }

    if (!isUnsuccessful && response.finalizedData) {
      state.set(stateKey, response.finalizedData);
    }

    // passing the original response
    return undefined;
  };
}
