import { BeforeModelCallback, LlmAgent } from '@google/adk';
import { RECOMMENDATION_KEY } from './output_keys.js';
import { generateFailedDecisionPrompt, generateRecommendationPrompt } from './prompts/recommendation.prompt.js';
import { recommendationSchema } from './types/index.js';
import { getEvaluationContext } from './utils.js';

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
    const { intent, antiPatterns, decision } = getEvaluationContext(context);

    if (!intent || !antiPatterns || !decision) {
        return {
            content: {
                role: 'model',
                parts: [
                    {
                        text: JSON.stringify({
                            text: '## Recommendation\n\nUnavailable due to missing required data.',
                        }),
                    },
                ],
            },
        };
    }
    return undefined;
};

export function createRecommendationAgent(model: string) {
    const recommendationAgent = new LlmAgent({
        name: 'RecommendationAgent',
        model,
        description:
            'Generates a recommendation report based on the user intent, identified anti-patterns, and architectural decision found in the session state.',
        beforeModelCallback,
        instruction: async (context) => {
            const { intent, antiPatterns, decision } = getEvaluationContext(context);
            if (intent && decision && decision.verdict === 'None') {
                return generateFailedDecisionPrompt(intent);
            } else if (intent && antiPatterns && decision) {
                return generateRecommendationPrompt(intent, antiPatterns, decision);
            }
            return 'Skipping LLM due to missing data.';
        },
        outputSchema: recommendationSchema,
        outputKey: RECOMMENDATION_KEY,
    });

    return recommendationAgent;
}
