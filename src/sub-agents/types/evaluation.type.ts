import { z } from 'zod';

export const userIntentSchema = z.object({
    goal: z.string(),
    task: z.string(),
    problem: z.string(),
    constraint: z.string(),
});

export const antiPatternsSchema = z.object({
    isChatbot: z.boolean(),
    isSingleAPI: z.boolean(),
    isHighVolume: z.boolean(),
    isWorkflow: z.boolean(),
    isSafetyCritical: z.boolean(),
});
