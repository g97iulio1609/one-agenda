import { addMinutes, formatISO, parseISO } from 'date-fns';

import { compareIsoDates, durationMinutes } from '../../domain/types';

export interface Interval {
  start: string;
  end: string;
}

export function toInterval(start: string, end: string): Interval {
  if (compareIsoDates(start, end) >= 0) {
    throw new Error(`Intervallo non valido: ${start} deve precedere ${end}`);
  }
  return { start, end };
}

export function clampInterval(target: Interval, bounds: Interval): Interval {
  const start = compareIsoDates(target.start, bounds.start) < 0 ? bounds.start : target.start;
  const end = compareIsoDates(target.end, bounds.end) > 0 ? bounds.end : target.end;
  if (compareIsoDates(start, end) >= 0) {
    return bounds;
  }
  return { start, end };
}

export function expandInterval(
  interval: Interval,
  minutesBefore: number,
  minutesAfter?: number
): Interval {
  const after = minutesAfter ?? minutesBefore;
  return {
    start: formatISO(addMinutes(parseISO(interval.start), -minutesBefore)),
    end: formatISO(addMinutes(parseISO(interval.end), after)),
  };
}

export function subtractInterval(source: Interval, removal: Interval): Interval[] {
  if (
    compareIsoDates(removal.end, source.start) <= 0 ||
    compareIsoDates(removal.start, source.end) >= 0
  ) {
    return [source];
  }

  const segments: Interval[] = [];
  if (compareIsoDates(removal.start, source.start) > 0) {
    segments.push({ start: source.start, end: removal.start });
  }
  if (compareIsoDates(removal.end, source.end) < 0) {
    segments.push({ start: removal.end, end: source.end });
  }
  return segments;
}

export function sortIntervals(intervals: Interval[]): Interval[] {
  return [...intervals].sort((a, b) => compareIsoDates(a.start, b.start));
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length <= 1) {
    return [...intervals];
  }

  const sorted = sortIntervals(intervals);
  return sorted.reduce<Interval[]>((acc, current) => {
    const last = acc.at(-1);
    if (!last) {
      acc.push(current);
      return acc;
    }

    if (compareIsoDates(current.start, last.end) <= 0) {
      const end = compareIsoDates(current.end, last.end) > 0 ? current.end : last.end;
      acc[acc.length - 1] = { start: last.start, end };
      return acc;
    }

    acc.push(current);
    return acc;
  }, []);
}

export function hasEnoughDuration(interval: Interval, minimumMinutes: number): boolean {
  return durationMinutes(interval.start, interval.end) >= minimumMinutes;
}

export function intervalDuration(interval: Interval): number {
  return durationMinutes(interval.start, interval.end);
}
