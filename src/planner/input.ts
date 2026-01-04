import { PlannerInputSchema, type PlannerInput } from '../domain/types';

export function mergePlannerInput(
  base: PlannerInput,
  overrides?: Partial<PlannerInput>
): PlannerInput {
  if (!overrides) {
    return base;
  }

  const merged: PlannerInput = {
    ...base,
    ...overrides,
    preferences: overrides.preferences
      ? { ...base.preferences, ...overrides.preferences }
      : base.preferences,
    tasks: overrides.tasks ?? base.tasks,
    events: overrides.events ?? base.events,
    constraints: overrides.constraints ?? base.constraints,
    emailActions: overrides.emailActions ?? base.emailActions,
    timezone: overrides.timezone ?? base.timezone,
    date: overrides.date ?? base.date,
  };

  return PlannerInputSchema.parse(merged);
}
