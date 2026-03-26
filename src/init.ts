import { createAnitPatternsAgent } from './sub-agents/anit-patterns-agent.js';
import { createAuditAndUploadAgents, createMergerAgent } from './sub-agents/audit-and-upload-agents.js';
import { createDecisionTreeAgent } from './sub-agents/decision-agent.js';
import { createProjectAgent } from './sub-agents/project-agent.js';
import { createRecommendationAgent } from './sub-agents/recommendation-agent.js';

export function initWorkflowAgent(model: string) {
  return [
    createProjectAgent(model),
    createAnitPatternsAgent(model),
    createDecisionTreeAgent(model),
    createRecommendationAgent(model),
    createAuditAndUploadAgents(model),
    createMergerAgent(model),
  ];
}
