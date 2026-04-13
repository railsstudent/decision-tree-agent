import { SingleAgentCallback } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';

export function agentStartCallback(failedKey?: string): SingleAgentCallback {
  return (context) => {
    if (!context || !context.state) {
      return undefined;
    }

    const start_time_key = `${context.agentName}_start_time`;

    context.state.set(start_time_key, Date.now());
    context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
    if (failedKey) {
      context.state.set(failedKey, false);
    }

    return undefined;
  };
}

export const agentEndCallback: SingleAgentCallback = (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const start_time_key = `${context.agentName}_start_time`;

  const now = Date.now();
  const startTime = context.state.get<number>(start_time_key) || now;
  console.log(
    `Performance Metrics for Agent "${context.agentName}": Total Elapsed Time: ${(now - startTime) / 1000} seconds.`,
  );
  return undefined;
};
