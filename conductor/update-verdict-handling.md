# Plan: Update Verdict Handling in RecommendationReportAgent

## Objective

Update the `RecommendationReportAgent` and the mock test data to treat the `DECISION_KEY` in the session state as an object containing a `verdict` property, following the recently added `decisionSchema`.

## Analysis

- Currently, `RecommendationReportAgent` in `src/sub-agents/recommendation-report-agent.ts` expects `DECISION_KEY` to be a direct string (e.g., `"Use Agent"`).
- `src/sub-agents/types/recommendation-report.type.ts` was updated with a `decisionSchema` that defines this value as an object: `{ verdict: 'Use Agent' | 'Use Simple API' | 'Use Workflow Automation' | 'Use LLM' }`.
- `src/agent.ts` currently injects a plain string for `DECISION_KEY`, which will cause the updated agent to fail its logic checks.

## Proposed Changes

### 1. Update `src/sub-agents/recommendation-report-agent.ts`

- Modify the `instruction` property's `INPUT DATA` and `LOGIC GUIDELINES` sections.
- Change references of `${DECISION_KEY}` to specifically mention it is an object and access its `.verdict` property.

### 2. Update `src/agent.ts`

- Modify the `inject_test_state` tool's `execute` function.
- Change `context?.state.set(DECISION_KEY, 'Use Agent');` to `context?.state.set(DECISION_KEY, { verdict: 'Use Agent' });`.

## Verification & Testing

1. Run `npm run build` to ensure no TypeScript compilation errors.
2. Run `npm run lint -- --fix` to ensure formatting adheres to project standards.
3. Manually verify the instructions in the updated agent file to ensure clarity on the `verdict` object.

## Approval

- Please approve this plan to finalize the verdict handling.
