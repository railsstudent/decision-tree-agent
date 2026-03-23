# Plan: Fix Session State Caching Issue

This plan addresses the issue where the `rootAgent` processes a new project description but the `SequentialEvaluationAgent` (and specifically `ProjectAgent`) still returns the evaluation for the previous project (e.g., "apple and orange").

## Analysis

The ADK `LlmAgent` and `SequentialAgent` share session state and conversation history. The sub-agents like `ProjectAgent` use a `beforeModelCallback` to check if their specific data key (e.g., `PROJECT_KEY`) is already present in the `context.state`. If it is, they short-circuit and return the cached JSON, skipping the LLM call entirely.
Because the session state is not cleared between requests within the same run, a second valid project description will still encounter a populated `PROJECT_KEY` from the first run. The system incorrectly assumes the evaluation is already finished. Furthermore, `PROJECT_DESCRIPTION_KEY` is never explicitly set by the orchestrator.

## Changes

### 1. `src/agent.ts`

We will introduce a new `FunctionTool` to explicitly reset the state and store the new description before running the pipeline.

- Import the relevant keys from `src/sub-agents/output_keys.ts` (`PROJECT_KEY`, `DECISION_KEY`, etc.).
- Create a `prepare_evaluation` tool. This tool will take `description` as a parameter. It will:
    - Delete old keys from `context.state` so the sub-agents run fresh.
    - Set `PROJECT_DESCRIPTION_KEY` to the new description parameter.
- Update the `rootAgent`'s tools to include this new `prepare_evaluation` tool.
- Update the `rootAgent`'s `instruction` to require it to call `prepare_evaluation(description)` with the user's valid description BEFORE executing the `SequentialEvaluationAgent`.

## Verification & Testing

1. **Test Case 1 (First Project):** Run the agent and provide a valid description (e.g., "Build a mobile app for tracking fitness goals"). Verify it returns a correct evaluation.
2. **Test Case 2 (Second Project):** In the same session, provide a new valid description (e.g., "A news summarizer app"). Verify that the `rootAgent` calls the `prepare_evaluation` tool to reset the state, and the `SequentialEvaluationAgent` evaluates the new project instead of returning the first one.

## Next Steps

- Present this plan for approval.
- Once approved, update `src/agent.ts`.
