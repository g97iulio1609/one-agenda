import { addMinutes, formatISO, parseISO } from 'date-fns';
import { v4 as uuid } from 'uuid';

import type { PlanBlock, PlanDecision, PlannerOptions } from '../../domain/types';
import type { RankedTask } from './task-prioritizer';
import type { Interval } from './interval';
import { intervalDuration } from './interval';

interface ScheduleResult {
  blocks: PlanBlock[];
  decisions: PlanDecision[];
  remaining: RankedTask[];
}

export class TaskScheduler {
  constructor(private readonly options: PlannerOptions) {}

  schedule(tasks: RankedTask[], intervals: Interval[]): ScheduleResult {
    const blocks: PlanBlock[] = [];
    const decisions: PlanDecision[] = [];
    const remaining = new Set<RankedTask>();

    for (const interval of intervals) {
      let cursor = interval.start;
      const intervalEnd = interval.end;

      while (tasks.some((task) => task.remainingMinutes > 0)) {
        const nextTask = tasks.find((candidate): candidate is RankedTask =>
          this.isTaskRunnable(candidate as RankedTask, tasks)
        );
        if (!nextTask) {
          break;
        }

        const taskEnd = formatISO(addMinutes(parseISO(cursor), nextTask.remainingMinutes));

        if (taskEnd <= cursor) {
          break;
        }

        if (taskEnd <= intervalEnd) {
          const block = this.createTaskBlock(cursor, taskEnd, nextTask, false);
          blocks.push(block);
          decisions.push({
            id: uuid(),
            title: `Assegnato "${nextTask.title}"`,
            rationale: `Allocato blocco completo da ${cursor} a ${taskEnd} seguendo priorità e stima.`,
            relatedBlockId: block.id,
          });
          cursor = taskEnd;
          nextTask.remainingMinutes = 0;
        } else if (this.options.allowTaskSplitting) {
          const minutesAvailable = intervalDuration({ start: cursor, end: intervalEnd });
          if (minutesAvailable <= 0) {
            break;
          }
          const block = this.createTaskBlock(cursor, intervalEnd, nextTask, true);
          blocks.push(block);
          decisions.push({
            id: uuid(),
            title: `Frammentato "${nextTask.title}"`,
            rationale: `Utilizzati ${minutesAvailable} minuti, restano ${
              nextTask.remainingMinutes - minutesAvailable
            } minuti da pianificare.`,
            relatedBlockId: block.id,
          });
          nextTask.remainingMinutes -= minutesAvailable;
          remaining.add(nextTask);
          break;
        } else {
          remaining.add(nextTask);
          break;
        }
      }
    }

    tasks
      .filter((task: RankedTask) => task.remainingMinutes > 0)
      .forEach((task: RankedTask) => {
        if (!remaining.has(task)) {
          remaining.add(task);
        }
      });

    return {
      blocks,
      decisions,
      remaining: Array.from(remaining),
    };
  }

  private isTaskRunnable(task: RankedTask, tasks: RankedTask[]): boolean {
    return (
      task.remainingMinutes > 0 &&
      task.dependencies.every(
        (dependencyId) =>
          !tasks.some(
            (candidate) => candidate.id === dependencyId && candidate.remainingMinutes > 0
          )
      )
    );
  }

  private createTaskBlock(
    start: string,
    end: string,
    task: RankedTask,
    partial: boolean
  ): PlanBlock {
    const focusType =
      task.focusType === 'MEETING' ? 'MEETING' : task.focusType === 'DEEP' ? 'DEEP' : 'LIGHT';

    return {
      id: uuid(),
      type: 'TASK',
      title: partial ? `${task.title} (parziale)` : task.title,
      start,
      end,
      sourceId: task.id,
      focusType,
      explanations: [
        `Priorità ${task.priority}`,
        task.dueDate ? `Scadenza ${task.dueDate}` : 'Senza scadenza',
        partial ? 'Spezzato per mancanza di tempo continuo' : 'Allocazione completa',
      ].filter((item): item is string => Boolean(item)),
    };
  }
}
