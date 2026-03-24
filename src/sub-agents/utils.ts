import { ReadonlyContext } from '@google/adk';
import {
    ANTI_PATTERNS_KEY,
    AUDIT_TRAIL_KEY,
    CLOUD_STORAGE_KEY,
    DECISION_KEY,
    PROJECT_DESCRIPTION_KEY,
    PROJECT_KEY,
    RECOMMENDATION_KEY,
} from './output_keys.js';
import { AntiPatterns, AuditTrail, CloudStorage, Decision, Recommendation, Project } from './types/index.js';

export function getEvaluationContext(context: ReadonlyContext | undefined) {
    if (!context || !context.state) {
        return {
            project: null,
            antiPatterns: null,
            decision: null,
            recommendation: null,
            projectDescription: null,
        };
    }

    const state = context.state;
    return {
        project: state.get<Project>(PROJECT_KEY) ?? null,
        antiPatterns: state.get<AntiPatterns>(ANTI_PATTERNS_KEY) ?? null,
        decision: state.get<Decision>(DECISION_KEY) ?? null,
        recommendation: state.get<Recommendation>(RECOMMENDATION_KEY) ?? null,
        projectDescription: context.state.get<string>(PROJECT_DESCRIPTION_KEY, '') ?? null,
    };
}

export function getAggregateContext(context: ReadonlyContext | undefined) {
    if (!context || !context.state) {
        return {
            auditTrail: null,
            cloudStorage: null,
            recommendation: null,
        };
    }

    const state = context.state;
    return {
        auditTrail: state.get<AuditTrail>(AUDIT_TRAIL_KEY) ?? null,
        cloudStorage: state.get<CloudStorage>(CLOUD_STORAGE_KEY) ?? null,
        recommendation: state.get<Recommendation>(RECOMMENDATION_KEY) ?? null,
    };
}

export function isProjectDetailsFilled(project: Project | null) {
    if (!project) {
        return {
            isCompleted: false,
            project: null,
        };
    }

    const isCompleted = project.constraint && project.goal && project.problem && project.task;
    return {
        isCompleted,
        project,
    };
}
