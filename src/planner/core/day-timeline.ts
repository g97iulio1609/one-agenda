import { parseISO, set, formatISO } from 'date-fns';

import type { PlannerInput, PlannerOptions, PlanBlock } from '../../domain/types';
import { compareIsoDates, durationMinutes } from '../../domain/types';
import {
  expandInterval,
  hasEnoughDuration,
  mergeIntervals,
  sortIntervals,
  subtractInterval,
  type Interval,
} from './interval';

function createDayBoundary(dateIso: string, time: string): string {
  if (time.includes('T')) {
    return time;
  }
  const date = parseISO(dateIso);
  const [hour, minute] = time.split(':').map(Number);
  return formatISO(set(date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 }));
}

export class DayTimeline {
  private readonly dayIntervals: Interval[];
  private readonly busy: Interval[] = [];
  private readonly minimumBreakMinutes: number;

  constructor(
    private readonly input: PlannerInput,
    private readonly options: PlannerOptions
  ) {
    this.dayIntervals = input.preferences.workingHours.map(
      (window: { start: string; end: string }) => ({
        start: createDayBoundary(input.date, window.start),
        end: createDayBoundary(input.date, window.end),
      })
    );
    this.minimumBreakMinutes = input.preferences.minimumBreakMinutes;

    this.addEvents();
    this.addFocusBlocks();
  }

  getAvailableIntervals(): Interval[] {
    const sortedBusy = mergeIntervals(this.busy);

    const free: Interval[] = [];
    for (const dayInterval of this.dayIntervals) {
      let segments: Interval[] = [dayInterval];
      for (const busy of sortedBusy) {
        const clamped: Interval = {
          start:
            compareIsoDates(busy.start, dayInterval.start) < 0 ? dayInterval.start : busy.start,
          end: compareIsoDates(busy.end, dayInterval.end) > 0 ? dayInterval.end : busy.end,
        };
        segments = segments.flatMap((segment) => subtractInterval(segment, clamped));
      }
      free.push(
        ...segments.filter((segment: Interval) =>
          hasEnoughDuration(segment, this.minimumBreakMinutes)
        )
      );
    }

    return sortIntervals(free);
  }

  getExistingEventBlocks(): PlanBlock[] {
    return this.input.events.map((event: (typeof this.input.events)[number]) => ({
      id: event.id,
      type: 'EVENT' as const,
      title: event.title,
      start: event.start,
      end: event.end,
      sourceId: event.id,
      focusType: event.category === 'MEETING' ? 'MEETING' : 'LIGHT',
      explanations: [event.flexibility === 'FIXED' ? 'Evento fisso' : 'Evento flessibile'],
    }));
  }

  private addEvents(): void {
    for (const event of this.input.events) {
      this.busy.push({ start: event.start, end: event.end });
      if (event.category === 'MEETING' || event.category === 'TRAVEL') {
        const buffer = expandInterval(
          { start: event.start, end: event.end },
          this.options.bufferBeforeMeetings
        );
        this.busy.push(buffer);
      }
    }
  }

  private addFocusBlocks(): void {
    for (const block of this.input.preferences.focusBlocks) {
      this.busy.push({ start: block.start, end: block.end });
    }
  }
}

export function buildBreakBlocks(blocks: PlanBlock[], minimumBreakMinutes: number): PlanBlock[] {
  if (blocks.length === 0) {
    return [];
  }

  const sorted = [...blocks].sort((a, b) => compareIsoDates(a.start, b.start));
  const breakBlocks: PlanBlock[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (!current || !next) continue;
    const gap = durationMinutes(current.end, next.start);
    if (gap >= minimumBreakMinutes) {
      breakBlocks.push({
        id: `${current.id}-break-${index}`,
        type: 'BREAK',
        title: 'Pausa rigenerante',
        start: current.end,
        end: next.start,
        sourceId: null,
        focusType: 'RECOVERY',
        explanations: ['Inserita automaticamente per mantenere energia'],
      });
    }
  }

  return breakBlocks;
}
