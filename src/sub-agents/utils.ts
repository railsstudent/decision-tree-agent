import { Context } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY } from './output_keys.js';

export function getEvaluationContext(context: Context | undefined) {
    if (!context || !context.state) {
        return {
            intent: null,
            antiPatterns: null,
            decision: null,
        };
    }

    return {
        intent: context.state.get(INTENT_KEY),
        antiPatterns: context.state.get(ANTI_PATTERNS_KEY),
        decision: context.state.get(DECISION_KEY),
    };
}
