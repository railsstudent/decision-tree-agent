import { BeforeModelCallback, LlmAgent } from '@google/adk';
import { RECOMMENDATION_KEY } from './output_keys.js';
import { generateFailedDecisionPrompt, generateRecommendationPrompt } from './prompts/recommendation.prompt.js';
import { recommendationSchema } from './types/index.js';
import { getEvaluationContext } from './utils.js';

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
    const { intent, antiPatterns, decision } = getEvaluationContext(context);

    const isIntentComplete = intent && intent.constraint && intent.goal && intent.problem && intent.task;
    const isIntentMissingData = intent && (!intent.constraint || !intent.goal || !intent.problem || !intent.task);

    if (isIntentComplete && antiPatterns && decision && decision.verdict !== 'None') {
        return undefined;
    } else if (isIntentMissingData && decision && decision.verdict === 'None') {
        return undefined;
    } else if (isIntentComplete && decision && decision.verdict === 'None') {
        return {
            content: {
                role: 'model',
                parts: [
                    {
                        text: JSON.stringify({
                            text: '## Recommendation: Manual Review Required\n\n**Status:** Abnormal Case Detected\n\nThe provided intent is complete and valid, but the decision tree could not reach a conclusive verdict (Result: `None`).\n\n**Possible Reasons:**\n- The requirements fall outside of known architectural patterns.\n- There are conflicting constraints and goals that cannot be resolved automatically.\n\n**Next Steps:**\n- Review and refine the constraints or goals.\n- Escalate for manual architectural review.',
                        }),
                    },
                ],
            },
        };
    }

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
};

export function createRecommendationAgent(model: string) {
    const recommendationAgent = new LlmAgent({
        name: 'RecommendationAgent',
        model,
        description:
            'Generates a recommendation report based on the user intent, identified anti-patterns, and architectural decision found in the session state.',
        beforeModelCallback,
        instruction: (context) => {
            const { intent, antiPatterns, decision } = getEvaluationContext(context);
            console.log('RecommendationAgent', intent, antiPatterns, decision);
            const isIntentComplete = intent && intent.constraint && intent.goal && intent.problem && intent.task;
            const isIntentMissingData =
                intent && (!intent.constraint || !intent.goal || !intent.problem || !intent.task);

            if (isIntentMissingData && decision && decision.verdict === 'None') {
                console.log('RecommendationAgent -> generateFailedDecisionPrompt');
                return generateFailedDecisionPrompt(intent);
            } else if (isIntentComplete && antiPatterns && decision && decision.verdict !== 'None') {
                console.log('RecommendationAgent -> generateRecommendationPrompt');
                return generateRecommendationPrompt(intent, antiPatterns, decision);
            }
            return 'Skipping LLM due to missing data.';
        },
        outputSchema: recommendationSchema,
        outputKey: RECOMMENDATION_KEY,
    });

    return recommendationAgent;
}
