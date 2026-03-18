import { z } from 'zod';

export const recommendationReportSchema = z.object({
    text: z.string(),
});

export type RecommendationReport = z.infer<typeof recommendationReportSchema>;
