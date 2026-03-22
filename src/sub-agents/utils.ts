import { ReadonlyContext } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, RECOMMENDATION_KEY } from './output_keys.js';

export function getEvaluationContext(context: ReadonlyContext | undefined) {
    if (!context || !context.state) {
        return {
            intent: null,
            antiPatterns: null,
            decision: null,
            report: null,
        };
    }

    return {
        intent: context.state.get(INTENT_KEY) ?? null,
        antiPatterns: context.state.get(ANTI_PATTERNS_KEY) ?? null,
        decision: context.state.get(DECISION_KEY) ?? null,
        report: context.state.get(RECOMMENDATION_KEY) ?? null,
    };
}
