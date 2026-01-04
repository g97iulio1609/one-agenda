import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';

import type {
  Plan,
  PlanBlock,
  PlanDecision,
  PlanSummary,
  PlannerInput,
  PlannerOptions,
} from '../../domain/types';
import { durationMinutes } from '../../domain/types';
import type { RankedTask } from './task-prioritizer';

interface SummaryParams {
  input: PlannerInput;
  blocks: PlanBlock[];
  rankedTasks: RankedTask[];
  remaining: RankedTask[];
  decisions: PlanDecision[];
  options: PlannerOptions;
}

export function buildPlanSummary(params: SummaryParams): Plan {
  const { input, blocks, rankedTasks, remaining, decisions } = params;
  const sortedBlocks = [...blocks].sort((a, b) => (a.start < b.start ? -1 : 1));
  const objectives = rankedTasks.slice(0, 3).map((task: RankedTask) => task.title);

  const totals = sortedBlocks.reduce(
    (acc: { focus: number; light: number; meetings: number; breaks: number }, block: PlanBlock) => {
      const minutes = durationMinutes(block.start, block.end);
      if (block.type === 'TASK') {
        if (block.focusType === 'DEEP') acc.focus += minutes;
        else acc.light += minutes;
      }
      if (block.type === 'EVENT') {
        acc.meetings += minutes;
      }
      if (block.type === 'BREAK') {
        acc.breaks += minutes;
      }
      return acc;
    },
    { focus: 0, light: 0, meetings: 0, breaks: 0 }
  );

  const first = sortedBlocks[0];
  const last = sortedBlocks.at(-1);
  const dayStart = first ? first.start : input.date;
  const dayEnd = last ? last.end : input.date;
  const spanMinutes = durationMinutes(dayStart, dayEnd);
  const scheduledMinutes: number = sortedBlocks.reduce(
    (sum: number, block: PlanBlock) => sum + durationMinutes(block.start, block.end),
    0
  );

  const risks = remaining.map((task: RankedTask) => ({
    id: uuid(),
    severity: (task.priority === 'MUST'
      ? 'HIGH'
      : task.priority === 'SHOULD'
        ? 'MEDIUM'
        : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
    description: `Il task "${task.title}" non è stato pianificato (restano ${task.remainingMinutes} minuti).`,
    mitigation: task.dueDate
      ? `Valuta spostamento eventi o estensione orario per rispettare la scadenza ${task.dueDate}.`
      : null,
  }));

  const summary: PlanSummary = {
    date: input.date,
    timezone: input.timezone,
    objectives,
    totalFocusMinutes: totals.focus,
    totalMeetingsMinutes: totals.meetings,
    slackMinutes: Math.max(0, spanMinutes - scheduledMinutes),
    risks,
  };

  return {
    summary,
    blocks: sortedBlocks,
    decisions,
    unscheduledTasks: remaining.map(
      ({ weight: _weight, remainingMinutes: _remainingMinutes, ...task }) => ({
        ...task,
        estimatedMinutes: task.estimatedMinutes,
      })
    ),
    metadata: {
      generatedAt: formatISO(new Date()),
      generator: 'OneAgenda Planner v2',
      version: '2.0.0',
    },
  } satisfies Plan;
}
