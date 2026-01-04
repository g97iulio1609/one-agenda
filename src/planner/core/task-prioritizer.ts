import { formatISO } from 'date-fns';

import type { Task } from '../../domain/types';
import { durationMinutes } from '../../domain/types';

export interface RankedTask extends Task {
  remainingMinutes: number;
  weight: number;
}

const PRIORITY_WEIGHT: Record<Task['priority'], number> = {
  MUST: 4,
  SHOULD: 3,
  COULD: 2,
  WONT: 1,
};

export function rankTasks(tasks: Task[], referenceDate: Date = new Date()): RankedTask[] {
  const nowIso = formatISO(referenceDate);

  return tasks
    .map<RankedTask>((task) => {
      const dueScore = task.dueDate ? 1 / Math.max(1, durationMinutes(nowIso, task.dueDate)) : 0;
      const weight = PRIORITY_WEIGHT[task.priority] * 100 + task.score + dueScore * 1000;

      return {
        ...task,
        remainingMinutes: task.estimatedMinutes,
        weight,
      };
    })
    .sort((a, b) => b.weight - a.weight);
}
