import { FunctionTool, LlmAgent } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, REPORT_KEY } from './output_keys.js';
import { recommendationReportSchema } from './types/recommendation-report.type.js';
import { getEvaluationContext } from './utils.js';

export const getEvaluationContextTool = new FunctionTool({
    name: 'get_evaluation_context',
    description:
        'Retrieves the user intent, identified anti-patterns, and architectural decision from the session state.',
    execute: async (_, context) => getEvaluationContext(context),
});

export function createRecommendationReportAgent(model: string) {
    const recommendationReportAgent = new LlmAgent({
        name: 'RecommendationReportAgent',
        model,
        description:
            'Generates a recommendation report based on the user intent, identified anti-patterns, and architectural decision found in the session state.',
        instruction: `
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

            ### INPUT DATA
            You MUST call the 'get_evaluation_context' tool to retrieve the intent, anti-patterns, and decision data from the session state.
            You MUST use ONLY the data returned by this tool. You MUST NOT hallucinate or invent any project details:
            - '${INTENT_KEY}': The original goal or use case.
            - '${ANTI_PATTERNS_KEY}': Any identified architectural anti-patterns.
            - '${DECISION_KEY}': An object containing a 'verdict' property (the chosen architecture).

            ### LOGIC GUIDELINES
            - CRITICAL: If '${ANTI_PATTERNS_KEY}' are present and ANY flag (isChatbot, isSingleAPI, isHighVolume, isWorkflow, isSafetyCritical) is true, you MUST NOT recommend using an Agent. You MUST ignore the '${DECISION_KEY}.verdict' data. Explain why an agent is unsuitable and recommend the appropriate alternative.
            - If no anti-patterns are true and '${DECISION_KEY}.verdict' is 'Use Agent', highlight how the solution leverages reasoning, adaptation, and tool use.
            - If no anti-patterns are true but '${DECISION_KEY}.verdict' is NOT 'Use Agent', explain why an agent should not be used and how to adapt the suggested verdict (Simple API, LLM, or Workflow) to the project.
            - Align with the framework: Use Agent, Use Simple API, Use Workflow Automation, or Use LLM.

            ### OUTPUT FORMAT
            - You MUST populate the 'text' property of the output schema with a Markdown formatted string.
            - The Markdown string MUST contain:
              - Main Heading: "## Recommendation".
              - Content:
                - You MUST start the content with 1 to 2 sentences that concisely summarize the task, goal, problem, and constraint found in the '${INTENT_KEY}' object.
                - Follow this with 1 to 2 short, concise paragraphs summarizing the architectural recommendation based on the logic guidelines above.
              - Summary: A heading "### Key points" followed by a bulleted list of technical rationales.
        `,
        tools: [getEvaluationContextTool],
        outputSchema: recommendationReportSchema,
        outputKey: REPORT_KEY,
    });

    return recommendationReportAgent;
}
