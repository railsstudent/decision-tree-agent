import { LlmAgent } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, REPORT_KEY } from './output_keys.js';
import { recommendationReportSchema } from './types/recommendation-report.type.js';

export function createRecommendationReportAgent(model: string) {
    const recommendationReportAgent = new LlmAgent({
        name: 'RecommendationReportAgent',
        model,
        description: 'Audit the intent, anti-patterns and decision of the evaluation.',
        instruction: `
            The data is in the session state and stored in the following key:
            ${ANTI_PATTERNS_KEY} - Anti-patterns.
            ${DECISION_KEY} - Decision to use agent or other solution such as API call.
            ${INTENT_KEY} - Goal, task, problem and constraint of the project to be evaluated.

            Retrieve these values to generate a recommendation report in markdown format.
        `,
        tools: [],
        outputSchema: recommendationReportSchema,
        outputKey: REPORT_KEY,
    });

    return recommendationReportAgent;
}
