# Plan: Fix Hallucination and Overwrites in RecommendationReportAgent

## Objective

Provide the `RecommendationReportAgent` with a way to reliably read the `intent`, `antiPatterns`, and `decision` from the session state so that it stops hallucinating these values. Prevent the LLM from outputting hallucinated keys that might inadvertently overwrite the session state.

## Analysis

The `RecommendationReportAgent`'s instructions tell it to "Read the following strictly from the session state". However, the ADK `LlmAgent` does not magically provide session state to the LLM unless one of two things happens:

1. `inputKeys` are provided to the agent config (if the framework supports it).
2. A `FunctionTool` is provided that the agent can call to retrieve the state.

Because the agent currently has `tools: []` and no `inputKeys` defined, the LLM receives no context data. It then hallucinates the `intent`, `decision`, and `anti-patterns`. Because it thinks it needs to process them, it likely outputs a JSON containing these hallucinated keys alongside the `text` property. Depending on the ADK's internal state merging logic, returning these hallucinated keys might cause them to overwrite the actual session state.

## Proposed Solution

### 1. Create a `FunctionTool` to retrieve session state

In `src/sub-agents/recommendation-report-agent.ts`, we will create a `get_evaluation_context` tool that reads `INTENT_KEY`, `ANTI_PATTERNS_KEY`, and `DECISION_KEY` from `context.state` and returns them.

```typescript
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { ANTI_PATTERNS_KEY, DECISION_KEY, INTENT_KEY, REPORT_KEY } from './output_keys.js';
import { recommendationReportSchema } from './types/recommendation-report.type.js';

export const getEvaluationContextTool = new FunctionTool({
    name: 'get_evaluation_context',
    description:
        'Retrieves the user intent, identified anti-patterns, and architectural decision from the session state.',
    parameters: z.object({}),
    execute: async (_, context) => {
        return {
            intent: context?.state.get(INTENT_KEY),
            antiPatterns: context?.state.get(ANTI_PATTERNS_KEY),
            decision: context?.state.get(DECISION_KEY),
        };
    },
});
```

### 2. Update `RecommendationReportAgent`

- Add `getEvaluationContextTool` to the `tools` array.
- Modify the `instruction` property to mandate calling this tool _before_ generating the final output. This matches the pattern used in `audit-and-report-agent.ts`.

**Updated Instructions:**

```typescript
            ### INPUT DATA
            You MUST call the 'get_evaluation_context' tool to retrieve the intent, anti-patterns, and decision data from the session state.
            You MUST use ONLY the data returned by this tool. You MUST NOT hallucinate or invent any project details.
```

## Implementation Steps

1. Edit `src/sub-agents/recommendation-report-agent.ts`.
2. Insert `getEvaluationContextTool`.
3. Update `tools` array and `instruction`.
4. Run `npm run lint -- --fix` and `npm run build`.

## Approval

Please approve this plan to fix the hallucination and state-overwriting issue.
