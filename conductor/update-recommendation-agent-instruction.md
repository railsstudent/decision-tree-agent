# Plan: Update Recommendation Agent Instructions

## Objective

Update the `RecommendationReportAgent`'s instructions in `src/sub-agents/recommendation-report-agent.ts` to be more authoritative and explicitly require a summary of the intent object's properties (task, goal, problem, constraint).

## Background & Context Analysis

Currently, the agent uses the `intent` object, but the instructions do not explicitly mandate summarizing all its components (task, goal, problem, constraint) in a specific format. Furthermore, the instructions could be made more authoritative using "You must" to ensure strict compliance with the output formatting requirements.

## Proposed Solution

### 1. Update `instruction` in `src/sub-agents/recommendation-report-agent.ts`

Modify the `INPUT DATA` and `OUTPUT FORMAT` sections to use authoritative language ("You MUST"), require a summary of the intent object's properties, and strictly forbid hallucination:

**Proposed changes:**

1. Update `INPUT DATA` to explicitly forbid hallucination:

```typescript
            ### INPUT DATA
            Read the following strictly from the session state. You MUST use ONLY the provided decision, intent, and anti-pattern data. You MUST NOT hallucinate or invent any project details:
            - '${INTENT_KEY}': The original goal or use case.
            - '${ANTI_PATTERNS_KEY}': Any identified architectural anti-patterns.
            - '${DECISION_KEY}': An object containing a 'verdict' property (the chosen architecture).
```

2. Update `OUTPUT FORMAT` to require the intent summary:

```typescript
            ### OUTPUT FORMAT
            - You MUST populate the 'text' property of the output schema with a Markdown formatted string.
            - The Markdown string MUST contain:
              - Main Heading: "## Recommendation".
              - Content:
                - You MUST start the content with 1 to 2 sentences that concisely summarize the task, goal, problem, and constraint found in the '${INTENT_KEY}' object.
                - Follow this with 1 to 2 short, concise paragraphs summarizing the architectural recommendation based on the logic guidelines above.
              - Summary: A heading "### Key points" followed by a bulleted list of technical rationales.
```

## Implementation Steps

1. Edit `src/sub-agents/recommendation-report-agent.ts` to apply the updated `OUTPUT FORMAT` string in the `instruction`.
2. Run `npm run lint -- --fix` and `npm run build` to verify the changes do not introduce any syntax or formatting errors.

## Verification

- Review the `src/sub-agents/recommendation-report-agent.ts` to ensure the authoritative language and intent summary requirements are present.

## Approval

Please approve this plan to finalize the update to the recommendation agent's instructions.
