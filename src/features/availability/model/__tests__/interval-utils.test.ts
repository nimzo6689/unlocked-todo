import { mergeIntervals, subtractIntervals } from '../interval-utils';

describe('interval-utils', () => {
  describe('mergeIntervals', () => {
    it('returns empty array for empty input', () => {
      expect(mergeIntervals([])).toEqual([]);
    });

    it('merges overlapping and touching intervals', () => {
      const merged = mergeIntervals([
        { startMs: 20, endMs: 30 },
        { startMs: 0, endMs: 10 },
        { startMs: 10, endMs: 20 },
        { startMs: 40, endMs: 50 },
      ]);

      expect(merged).toEqual([
        { startMs: 0, endMs: 30 },
        { startMs: 40, endMs: 50 },
      ]);
    });
  });

  describe('subtractIntervals', () => {
    it('returns empty array when base interval is invalid', () => {
      const result = subtractIntervals({ startMs: 10, endMs: 10 }, [{ startMs: 0, endMs: 5 }]);

      expect(result).toEqual([]);
    });

    it('keeps segment unchanged when blocked does not overlap', () => {
      const result = subtractIntervals({ startMs: 0, endMs: 10 }, [{ startMs: 20, endMs: 30 }]);

      expect(result).toEqual([{ startMs: 0, endMs: 10 }]);
    });

    it('subtracts and splits interval by blocked ranges', () => {
      const result = subtractIntervals({ startMs: 0, endMs: 100 }, [
        { startMs: 20, endMs: 40 },
        { startMs: 60, endMs: 80 },
      ]);

      expect(result).toEqual([
        { startMs: 0, endMs: 20 },
        { startMs: 40, endMs: 60 },
        { startMs: 80, endMs: 100 },
      ]);
    });
  });
});
