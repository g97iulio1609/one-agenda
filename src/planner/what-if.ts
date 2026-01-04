import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';

import type { PlannerInput, Plan, Task, WhatIfScenario } from '../domain/types';
import { PlannerInputSchema, WhatIfScenarioSchema, PlanSchema } from '../domain/types';
import { planDay } from './plan-day';

type WhatIfResult = {
  baseline: Plan;
  scenario: Plan;
  summary: {
    message: string;
    impactedTasks: string[];
  };
};

type ScenarioHandler = (
  input: PlannerInput,
  scenario: WhatIfScenario,
  impacted: string[]
) => PlannerInput;

const scenarioHandlers: Record<WhatIfScenario['type'], ScenarioHandler> = {
  INCREASE_PRIORITY: (input, scenario, impacted) => {
    if (!scenario.taskId) return input;
    return {
      ...input,
      tasks: input.tasks.map((task: Task) => {
        if (task.id !== scenario.taskId) {
          return task;
        }
        impacted.push(task.title);
        const increasedScore = Math.min(100, task.score + (scenario.increase ?? 10));
        const priority =
          task.priority === 'COULD'
            ? 'SHOULD'
            : task.priority === 'SHOULD'
              ? 'MUST'
              : task.priority;
        return {
          ...task,
          score: increasedScore,
          priority,
        };
      }),
    };
  },
  DELAY_DEADLINE: (input, scenario, impacted) => {
    if (!scenario.taskId) return input;
    return {
      ...input,
      tasks: input.tasks.map((task: Task) => {
        if (task.id !== scenario.taskId || !task.dueDate) {
          return task;
        }
        impacted.push(task.title);
        const minutes = scenario.delayMinutes ?? 60;
        const newDue = new Date(task.dueDate);
        newDue.setMinutes(newDue.getMinutes() + minutes);
        return { ...task, dueDate: formatISO(newDue) };
      }),
    };
  },
  ADD_TASK: (input, scenario, impacted) => {
    if (!scenario.newTask) return input;
    impacted.push(scenario.newTask.title);
    const newTask = { ...scenario.newTask, id: scenario.newTask.id ?? uuid() };
    return {
      ...input,
      tasks: [...input.tasks, newTask],
    };
  },
};

export function runWhatIfScenario(
  rawInput: PlannerInput,
  baselinePlan: Plan,
  rawScenario: WhatIfScenario
): WhatIfResult {
  const input = PlannerInputSchema.parse(rawInput);
  const scenario = WhatIfScenarioSchema.parse(rawScenario);
  const baseline = PlanSchema.parse(baselinePlan);

  const impacted: string[] = [];
  const handler = scenarioHandlers[scenario.type];
  const mutatedInput = handler ? handler(input, scenario, impacted) : input;
  const scenarioPlan = planDay(mutatedInput);

  return {
    baseline,
    scenario: scenarioPlan,
    summary: {
      message:
        impacted.length > 0
          ? `Scenario applicato con impatto su: ${impacted.join(', ')}`
          : 'Scenario applicato senza variazioni significative',
      impactedTasks: impacted,
    },
  };
}
