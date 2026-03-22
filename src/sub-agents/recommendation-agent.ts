import { BeforeModelCallback, LlmAgent } from '@google/adk';
import { RECOMMENDATION_KEY } from './output_keys.js';
import { generateFailedDecisionPrompt, generateRecommendationPrompt } from './prompts/recommendation.prompt.js';
import { recommendationSchema } from './types/index.js';
import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
    const { project, antiPatterns, decision } = getEvaluationContext(context);

    const { isCompleted, isMissingData } = isProjectDetailsFilled(project);
    const isDecisionNone = decision && decision.verdict === 'None';

    if (isCompleted && antiPatterns && decision && decision.verdict !== 'None') {
        return undefined;
    } else if (isMissingData && isDecisionNone) {
        return undefined;
    } else if (isCompleted && isDecisionNone) {
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
            const { project, antiPatterns, decision } = getEvaluationContext(context);
            console.log('RecommendationAgent', project, antiPatterns, decision);
            const { isCompleted, isMissingData } = isProjectDetailsFilled(project);

            if (project && isMissingData && decision && decision.verdict === 'None') {
                console.log('RecommendationAgent -> generateFailedDecisionPrompt');
                return generateFailedDecisionPrompt(project);
            } else if (project && isCompleted && antiPatterns && decision && decision.verdict !== 'None') {
                console.log('RecommendationAgent -> generateRecommendationPrompt');
                return generateRecommendationPrompt(project, antiPatterns, decision);
            }
            return 'Skipping LLM due to missing data.';
        },
        outputSchema: recommendationSchema,
        outputKey: RECOMMENDATION_KEY,
    });

    return recommendationAgent;
}
