import { LlmAgent } from '@google/adk';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, REPORT_KEY } from './output_keys.js';
import { recommendationReportSchema } from './types/recommendation-report.type.js';

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
            Read the following from the session state:
            - '${INTENT_KEY}': The original goal or use case.
            - '${ANTI_PATTERNS_KEY}': Any identified architectural anti-patterns.
            - '${DECISION_KEY}': The evaluation decision matrix (multiple steps, reasoning, adaptation, external actions).

            ### LOGIC GUIDELINES
            - CRITICAL: If '${ANTI_PATTERNS_KEY}' are present and ANY flag is true, you MUST ignore the '${DECISION_KEY}' data. Use the '${ANTI_PATTERNS_KEY}' knowledge above to explain why an agent is unsuitable and recommend a simpler alternative.
            - If no anti-patterns are true and the '${DECISION_KEY}' is "Use Agent", highlight how the solution leverages reasoning, adaptation, and tool use.
            - If no anti-patterns are true but the '${DECISION_KEY}' is NOT "Use Agent", explain why an agent should not be used (based on the criteria above) and how to adapt the decision (e.g., LLM, API, or Workflow) to the current project.
            - Align with the framework: Use Agent, Use Simple API, Use Workflow Automation, or Use LLM.

            ### OUTPUT FORMAT
            - Format: Markdown.
            - Main Heading: "## Recommendation".
            - Content: 1 to 2 short, concise paragraphs summarizing the recommendation.
            - Summary: A heading "### Key points" followed by a bulleted list of technical rationales.
        `,
        tools: [],
        outputSchema: recommendationReportSchema,
        outputKey: REPORT_KEY,
    });

    return recommendationReportAgent;
}
