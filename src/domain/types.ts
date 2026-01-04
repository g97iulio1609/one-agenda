import { z } from 'zod';
import { differenceInMinutes, isAfter, isBefore, parseISO } from 'date-fns';

type ISODate = string;

export const PreferenceSchema = z.object({
  workingHours: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
    })
  ),
  focusBlocks: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    )
    .default([]),
  meetingFreeDays: z.array(z.number().min(0).max(6)).default([]),
  timezone: z.string().default('Europe/Rome'),
  minimumBreakMinutes: z.number().min(0).default(15),
  transitionBufferMinutes: z.number().min(0).default(5),
  defaultMeetingDurationMinutes: z.number().min(5).default(30),
});

export type Preference = z.infer<typeof PreferenceSchema>;

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email().optional(),
  workingHours: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        start: z.string(),
        end: z.string(),
      })
    )
    .optional(),
  timezone: z.string().optional(),
});

export type Person = z.infer<typeof PersonSchema>;

export const ConstraintSchema = z.object({
  id: z.string(),
  type: z.enum(['HARD', 'SOFT']),
  description: z.string(),
  condition: z.string(),
  priority: z.number().min(1).max(5).default(3),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  estimatedMinutes: z.number().min(5),
  dueDate: z.string().nullable(),
  priority: z.enum(['MUST', 'SHOULD', 'COULD', 'WONT']).default('SHOULD'),
  score: z.number().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
  project: z.string().nullable().default(null),
  dependencies: z.array(z.string()).default([]),
  requiredPeople: z.array(PersonSchema).default([]),
  preferredWindow: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .nullable()
    .default(null),
  allowFragmentation: z.boolean().default(false),
  focusType: z.enum(['DEEP', 'LIGHT', 'MEETING']).default('DEEP'),
});

export type Task = z.infer<typeof TaskSchema>;

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  source: z.enum(['EXTERNAL', 'INTERNAL']).default('EXTERNAL'),
  meeting: z
    .object({
      attendees: z.array(PersonSchema).default([]),
      meetingLink: z.string().nullable().default(null),
      organizer: PersonSchema.optional(),
    })
    .default({ attendees: [], meetingLink: null }),
  category: z.enum(['MEETING', 'FOCUS', 'TRAVEL', 'PERSONAL', 'OTHER']).default('OTHER'),
  flexibility: z.enum(['FIXED', 'MOVABLE', 'OPTIONAL']).default('FIXED'),
  createdFrom: z.enum(['CALENDAR', 'EMAIL', 'TASK', 'SYSTEM']).default('CALENDAR'),
});

export type Event = z.infer<typeof EventSchema>;

export const EmailActionSchema = z.object({
  id: z.string(),
  subject: z.string(),
  snippet: z.string(),
  extractedTasks: z.array(TaskSchema).default([]),
  dueDate: z.string().nullable(),
  participants: z.array(PersonSchema).default([]),
});

export type EmailAction = z.infer<typeof EmailActionSchema>;

export const PlanBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['TASK', 'EVENT', 'BUFFER', 'BREAK']),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  sourceId: z.string().nullable(),
  focusType: z.enum(['DEEP', 'LIGHT', 'MEETING', 'RECOVERY']).default('LIGHT'),
  explanations: z.array(z.string()).default([]),
});

export type PlanBlock = z.infer<typeof PlanBlockSchema>;

export const RiskSchema = z.object({
  id: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  description: z.string(),
  mitigation: z.string().nullable(),
});

export type Risk = z.infer<typeof RiskSchema>;

export const PlanDecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  relatedBlockId: z.string().nullable(),
});

export type PlanDecision = z.infer<typeof PlanDecisionSchema>;

export const PlanSummarySchema = z.object({
  date: z.string(),
  timezone: z.string(),
  objectives: z.array(z.string()),
  totalFocusMinutes: z.number(),
  totalMeetingsMinutes: z.number(),
  slackMinutes: z.number(),
  risks: z.array(RiskSchema),
});

export type PlanSummary = z.infer<typeof PlanSummarySchema>;

export const PlanSchema = z.object({
  summary: PlanSummarySchema,
  blocks: z.array(PlanBlockSchema),
  decisions: z.array(PlanDecisionSchema),
  unscheduledTasks: z.array(TaskSchema),
  metadata: z.object({
    generatedAt: z.string(),
    generator: z.string(),
    version: z.string(),
  }),
});

export type Plan = z.infer<typeof PlanSchema>;

export const PlannerInputSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  tasks: z.array(TaskSchema),
  events: z.array(EventSchema),
  constraints: z.array(ConstraintSchema),
  preferences: PreferenceSchema,
  emailActions: z.array(EmailActionSchema).default([]),
});

export type PlannerInput = z.infer<typeof PlannerInputSchema>;

export const PlannerOptionsSchema = z.object({
  allowTaskSplitting: z.boolean().default(true),
  protectDeepWork: z.boolean().default(true),
  preferMorningFocus: z.boolean().default(true),
  bufferBeforeMeetings: z.number().min(0).default(10),
});

export type PlannerOptions = z.infer<typeof PlannerOptionsSchema>;

export const WhatIfScenarioSchema = z.object({
  type: z.enum(['INCREASE_PRIORITY', 'DELAY_DEADLINE', 'ADD_TASK']),
  taskId: z.string().optional(),
  increase: z.number().optional(),
  delayMinutes: z.number().optional(),
  newTask: TaskSchema.optional(),
});

export type WhatIfScenario = z.infer<typeof WhatIfScenarioSchema>;

export function compareIsoDates(a: ISODate, b: ISODate): number {
  const dateA = parseISO(a);
  const dateB = parseISO(b);
  if (isBefore(dateA, dateB)) return -1;
  if (isAfter(dateA, dateB)) return 1;
  return 0;
}

export function durationMinutes(start: ISODate, end: ISODate): number {
  return Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)));
}
