import { z } from 'zod';

export const decisionSchema = z.object({
    verdict: z.enum(['Use Agent', 'Use Simple API', 'Use Workflow Automation', 'Use LLM']),
});

export type Decision = z.infer<typeof decisionSchema>;

export const recommendationReportSchema = z.object({
    text: z.string(),
});

export type RecommendationReport = z.infer<typeof recommendationReportSchema>;
