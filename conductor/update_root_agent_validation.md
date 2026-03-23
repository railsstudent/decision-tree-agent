# Plan: Add Input Validation to `rootAgent`

This plan details the steps to update the `rootAgent` in `src/agent.ts` to include a validation step that filters out nonsensical or unhelpful project descriptions before they are processed by the evaluation pipeline.

## Analysis

The current `rootAgent` in `src/agent.ts` is an orchestrator that asks for a project description and immediately executes the `SequentialEvaluationAgent`. It lacks a filter for "junk" or nonsensical inputs (e.g., "apple and orange"), which can cause downstream agents to hallucinate a project structure. By adding a validation instruction to the `rootAgent`, we can leverage the LLM's reasoning to ensure the input is a valid project description before proceeding.

## Changes

The `instruction` for the `rootAgent` will be updated to include a triage step.

### `src/agent.ts`

Modify the `rootAgent`'s `instruction` to:

- Ask the user for a project description.
- Evaluate the description to ensure it describes a legitimate project (software, business, AI, etc.) and is not nonsensical or too brief.
- If the input is invalid (e.g., "apple and orange", "hello"), explain why and ask for a proper description.
- ONLY if the input is valid, execute the `SequentialEvaluationAgent`.

## Verification & Testing

1.  **Reproduction:** Run the agent and enter a nonsensical input like "apple and orange". Verify that it currently proceeds to the extraction phase and produces hallucinated results.
2.  **Test Case 1 (Valid Input):** Run the agent and provide a valid description (e.g., "Build a mobile app for tracking fitness goals"). Verify that the `SequentialEvaluationAgent` is executed and a full evaluation is returned.
3.  **Test Case 2 (Invalid Input):** Run the agent and provide a nonsensical input (e.g., "apple and orange"). Verify that the agent rejects the input, provides a reason, and asks for a proper description instead of executing the `SequentialEvaluationAgent`.
4.  **Test Case 3 (Brief Input):** Provide a very brief input like "fix it". Verify that the agent asks for more detail before proceeding.

## Next Steps

- Present this plan for approval.
- Once approved, update `src/agent.ts`.
