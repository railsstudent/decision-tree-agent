import { LlmAgent } from '@google/adk';
import { RECOMMENDATION_KEY } from './output_keys.js';
import {
    MISSING_DATA_PROMPT,
    generateFailedDecisionPrompt,
    generateRecommendationPrompt,
} from './prompts/recommendation.prompt.js';
import { recommendationSchema } from './types/index.js';
import { getEvaluationContext } from './utils.js';

export function createRecommendationAgent(model: string) {
    const recommendationAgent = new LlmAgent({
        name: 'RecommendationAgent',
        model,
        description:
            'Generates a recommendation report based on the user intent, identified anti-patterns, and architectural decision found in the session state.',
        instruction: async (context) => {
            const { intent, antiPatterns, decision } = getEvaluationContext(context);

            if (!intent || !antiPatterns || !decision) {
                return MISSING_DATA_PROMPT;
            } else if (decision && decision.verdict === 'None') {
                return generateFailedDecisionPrompt(intent);
            }
            return generateRecommendationPrompt(intent, antiPatterns, decision);
        },
        tools: [],
        outputSchema: recommendationSchema,
        outputKey: RECOMMENDATION_KEY,
    });

    return recommendationAgent;
}
