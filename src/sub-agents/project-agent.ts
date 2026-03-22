import { BeforeModelCallback, FunctionTool, LlmAgent } from '@google/adk';
import { PROJECT_DESCRIPTION_KEY, PROJECT_KEY } from './output_keys.js';
import { projectSchema } from './types/index.js';
import { getEvaluationContext, isProjectDetailsFilled } from './utils.js';

const MAX_ITERATIONS = 3;

export const validateProjectTool = new FunctionTool({
    name: 'validate_project',
    description:
        'Validates the LLM-generated task, problem, goal, and constraint to ensure they are not blank. Returns SUCCESS or an ERROR message.',
    parameters: projectSchema,
    execute: async ({ task, problem, goal, constraint }, toolContext) => {
        // Track the number of validation attempts in the session state
        let attempts = toolContext?.state.get<number>('VALIDATION_ATTEMPTS') || 0;
        attempts = attempts + 1;
        if (toolContext) {
            toolContext.state.set('VALIDATION_ATTEMPTS', attempts);
        }

        if (attempts >= MAX_ITERATIONS) {
            console.log(`Max validation attempts reached (${attempts}). Forcing LLM to terminate.`);
            if (toolContext) {
                // Break the internal LLM tool-calling loop
                toolContext.actions.escalate = true;
            }
            return {
                status: 'FATAL_ERROR',
                message: `STOP processing immediately. Max validation attempts reached. Return the most accurate data found so far or empty strings if none.`,
            };
        }

        if (!task) {
            return {
                status: 'ERROR',
                message: "Missing 'task'. Please provide a concise description of the specific action to be performed.",
            };
        } else if (!problem) {
            return {
                status: 'ERROR',
                message: "Missing 'problem'. Please describe the underlying issue or pain point.",
            };
        } else if (!goal) {
            return {
                status: 'ERROR',
                message: "Missing 'goal'. Please specify the desired outcome or objective.",
            };
        } else if (!constraint) {
            return {
                status: 'ERROR',
                message: "Missing 'constraint'. Please list any limitations, requirements, or boundaries.",
            };
        }

        return {
            status: 'SUCCESS',
            message: 'Project breakdown is successful, you can now return the final output schema and finish.',
        };
    },
});

const beforeModelCallback: BeforeModelCallback = async ({ context }) => {
    // If we already have a valid project breakdown (e.g., from a previous loop iteration), stop the loop.
    const { project } = getEvaluationContext(context);
    const { isCompleted } = isProjectDetailsFilled(project);

    if (isCompleted) {
        return {
            content: {
                role: 'model',
                parts: [
                    {
                        text: JSON.stringify(project),
                    },
                ],
            },
        };
    }

    return undefined;
};

export function createProjectAgent(model: string) {
    const projectAgent = new LlmAgent({
        name: 'ProjectAgent',
        model,
        description:
            'Analyzes a project description to extract and structure its core components: the task, the underlying problem, the ultimate goal, and any constraints.',
        beforeModelCallback,
        instruction: (context) => {
            if (!context || !context.state) {
                return '';
            }

            const description = context.state.get<string>(PROJECT_DESCRIPTION_KEY);

            return `
            You are an expert AI architecture consultant. Your task is to analyze the provided project description and break it down into four core components:
            1. Task: What specific action needs to be performed?
            2. Problem: What is the underlying issue or pain point being addressed?
            3. Goal: What is the desired outcome or objective?
            4. Constraint: What are the limitations, requirements, or boundaries?

            ### INPUT DATA (READ-ONLY)
            The following data has been retrieved from the session state for this project. You MUST use ONLY this data and MUST NOT hallucinate or invent any details:
            - DESCRIPTION: ${description}
            
            ### VALIDATION STEP
            Before generating your final JSON output, you MUST call the 'validate_project' tool with your extracted components (e.g. { "task": "...", "problem": "...", "goal": "...", "constraint": "..." }).
            - If the tool returns 'SUCCESS', you may output the final JSON schema.
            - If the tool returns an error, you MUST address the missing or invalid fields and try again.

            ### OUTPUT FORMAT
            - You MUST populate the 'task', 'problem', 'goal', and 'constraint' properties of the output schema with your extracted and validated components.
        `;
        },
        tools: [validateProjectTool],
        outputSchema: projectSchema,
        outputKey: PROJECT_KEY,
    });

    return projectAgent;
}
