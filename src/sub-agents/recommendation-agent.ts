import { LlmAgent } from '@google/adk';
import { RECOMMENDATION_KEY } from './output_keys.js';
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
                return `
                Your task is to generate a recommendation report.
                However, some required data (intent, anti-patterns, or decision) is missing from the session state.

                ### OUTPUT FORMAT
                - You MUST populate the 'text' property of the output schema with exactly the following Markdown text:
                    - Main Heading: "## Recommendation".
                    - Content:
                        - Unavailable due to missing required data.
                `;
            }

            return `
            You are an expert AI architecture consultant. Your task is to synthesize an architectural recommendation report based on Google's Agent Fundamentals.

            ### KNOWLEDGE BASE: AGENT FUNDAMENTALS
            1. FIVE CHARACTERISTICS OF A TRUE AGENT:
               - Goal-directed behavior: Works toward objectives, not just responding to queries.
               - Autonomous operation: Acts independently without explicit instruction for each step.
               - Proactive initiative: Actively works toward goals even in the absence of instruction.
               - Environmental awareness: Perceives environment (API responses, user requests) and updates its world model.
               - Tool use: Interacts with the outside world (APIs, databases) to perform actions.

            2. ANTI-PATTERNS (When NOT to use an agent):
               - Simple Q&A: Straightforward answers from a knowledge base.
               - Single API calls: Single-function tasks like "get today's weather".
               - High-volume, low-complexity: Routine automation (resizing 10,000 images).
               - Deterministic workflows: Entirely rule-based processes with no variation.
               - Real-time, latency-sensitive: Microsecond decisions where reasoning loops add unacceptable lag.

            3. DECISION CRITERIA:
               - Use Agent: Requires reasoning + adaptation + multi-step execution + external actions.
               - Use Simple API: Single step, no complex reasoning needed.
               - Use LLM: Complex reasoning needed but no external actions or adaptation.
               - Use Workflow Automation: Multi-step but deterministic/rule-based.

            ### INPUT DATA (READ-ONLY)
            The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any project details:
            - INTENT: ${JSON.stringify(intent)}
            - ANTI-PATTERNS: ${JSON.stringify(antiPatterns)}
            - DECISION: ${JSON.stringify(decision)}

            ### LOGIC GUIDELINES
            - CRITICAL: If any ANTI-PATTERN flag (isChatbot, isSingleAPI, isHighVolume, isWorkflow, isSafetyCritical) is true, you MUST NOT recommend using an Agent. You MUST ignore the DECISION verdict data. Explain why an agent is unsuitable and recommend the appropriate alternative.
            - If no anti-patterns are true and the DECISION verdict is 'Use Agent', highlight how the solution leverages reasoning, adaptation, and tool use.
            - If no anti-patterns are true but the DECISION verdict is NOT 'Use Agent', explain why an agent should not be used and how to adapt the suggested verdict (Simple API, LLM, or Workflow) to the project.
            - Align with the framework: Use Agent, Use Simple API, Use Workflow Automation, or Use LLM.

            ### OUTPUT FORMAT
            - You MUST populate the 'text' property of the output schema with a Markdown formatted string.
            - The Markdown string MUST contain:
              - Main Heading: "## Recommendation".
              - Content:
                - You MUST start the content with 1 to 2 sentences that concisely summarize the task, goal, problem, and constraint found in the INTENT object.
                - Follow this with 1 to 2 short, concise paragraphs summarizing the architectural recommendation based on the logic guidelines above.
              - Summary: A heading "### Key points" followed by a bulleted list of technical rationales.
        `;
        },
        tools: [],
        outputSchema: recommendationSchema,
        outputKey: RECOMMENDATION_KEY,
    });

    return recommendationAgent;
}
