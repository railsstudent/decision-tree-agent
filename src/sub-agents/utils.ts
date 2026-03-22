import { ReadonlyContext } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, RECOMMENDATION_KEY } from './output_keys.js';
import { UserIntent, Decision, Recommendation, AntiPatterns } from './types/index.js';

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
        intent: context.state.get<UserIntent>(INTENT_KEY) ?? undefined,
        antiPatterns: context.state.get<AntiPatterns>(ANTI_PATTERNS_KEY) ?? undefined,
        decision: context.state.get<Decision>(DECISION_KEY) ?? undefined,
        report: context.state.get<Recommendation>(RECOMMENDATION_KEY) ?? undefined,
    };
}
