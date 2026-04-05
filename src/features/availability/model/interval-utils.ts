import type { Interval } from './types';

export const mergeIntervals = (intervals: Interval[]) => {
  if (intervals.length === 0) {
    return [] as Interval[];
  }

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  return sorted.reduce<Interval[]>((merged, interval) => {
    const last = merged[merged.length - 1];
    if (!last || interval.startMs > last.endMs) {
      merged.push({ ...interval });
      return merged;
    }

    last.endMs = Math.max(last.endMs, interval.endMs);
    return merged;
  }, []);
};

export const subtractIntervals = (base: Interval, blocked: Interval[]) => {
  if (base.endMs <= base.startMs) {
    return [] as Interval[];
  }

  let segments: Interval[] = [base];

  blocked.forEach((block) => {
    segments = segments.flatMap((segment) => {
      if (block.endMs <= segment.startMs || block.startMs >= segment.endMs) {
        return [segment];
      }

      const nextSegments: Interval[] = [];
      if (block.startMs > segment.startMs) {
        nextSegments.push({ startMs: segment.startMs, endMs: block.startMs });
      }
      if (block.endMs < segment.endMs) {
        nextSegments.push({ startMs: block.endMs, endMs: segment.endMs });
      }
      return nextSegments;
    });
  });

  return segments.filter((segment) => segment.endMs > segment.startMs);
};
