import { SingleAgentCallback } from '@google/adk';
import { VALIDATION_ATTEMPTS_KEY } from '../output-keys.const.js';

export const START_TIME_KEY = 'start_time';

export const agentStartCallback: SingleAgentCallback = (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  context.state.set(START_TIME_KEY, Date.now());
  context.state.set(VALIDATION_ATTEMPTS_KEY, 0);
  return undefined;
};

export const agentEndCallback: SingleAgentCallback = (context) => {
  if (!context || !context.state) {
    return undefined;
  }

  const now = Date.now();
  const startTime = context.state.get<number>(START_TIME_KEY) || now;
  console.log(
    `Performance Metrics for Agent "${context.agentName}": Total Elapsed Time: ${(now - startTime) / 1000} seconds.`,
  );
  return undefined;
};
