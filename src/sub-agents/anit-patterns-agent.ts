import { BeforeModelCallback, LlmAgent } from '@google/adk';
import { ANTI_PATTERNS_KEY } from './output_keys.js';
import { generateAntiPatternsPrompt } from './prompts/anit-patterns.prompt.js';
import { antiPatternsSchema } from './types/index.js';
import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
    const { project } = getEvaluationContext(context);
    const { isCompleted } = isProjectDetailsFilled(project);

    // When the project breakdown is incomplete, we cannot determine the anti-patterns
    if (!isCompleted) {
        return {
            content: {
                role: 'model',
                parts: [
                    {
                        text: JSON.stringify(null),
                    },
                ],
            },
        };
    }

    return undefined;
};

export function createAnitPatternsAgent(model: string) {
    const antiPatternsAgent = new LlmAgent({
        name: 'AntiPatternsAgent',
        model,
        description:
            'Analyzes a project description to detect any clear anti-patterns. When there is clear anti-patterns, it is an indication not to use the agent architecture.',
        beforeModelCallback,
        instruction: (context) => {
            const { project } = getEvaluationContext(context);
            const { isCompleted } = isProjectDetailsFilled(project);

            if (project && isCompleted) {
                return generateAntiPatternsPrompt(project);
            }

            return 'Skipping LLM due to incomplete project breakdown data.';
        },
        tools: [],
        outputSchema: antiPatternsSchema,
        outputKey: ANTI_PATTERNS_KEY,
    });

    return antiPatternsAgent;
}
