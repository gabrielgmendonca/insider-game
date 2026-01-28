import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerManager } from './TimerManager.js';

describe('TimerManager', () => {
  let timerManager: TimerManager;

  beforeEach(() => {
    timerManager = new TimerManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startTimer', () => {
    it('should call onTick immediately with initial duration', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 10, onTick, onComplete);

      expect(onTick).toHaveBeenCalledWith(10);
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('should call onTick every second with decreasing values', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 5, onTick, onComplete);

      // Initial call
      expect(onTick).toHaveBeenLastCalledWith(5);

      // Advance 1 second
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(4);

      // Advance another second
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(3);

      // Advance another second
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(2);
    });

    it('should call onComplete when timer reaches zero', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 3, onTick, onComplete);

      expect(onComplete).not.toHaveBeenCalled();

      // Advance 3 seconds
      vi.advanceTimersByTime(3000);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should stop the old timer when starting a new one for the same room', () => {
      const onTick1 = vi.fn();
      const onComplete1 = vi.fn();
      const onTick2 = vi.fn();
      const onComplete2 = vi.fn();

      timerManager.startTimer('room1', 10, onTick1, onComplete1);
      vi.advanceTimersByTime(2000);

      // Start a new timer for the same room
      timerManager.startTimer('room1', 5, onTick2, onComplete2);

      // Advance time
      vi.advanceTimersByTime(3000);

      // The second timer should be ticking
      expect(onTick2).toHaveBeenLastCalledWith(2);
      // The first timer should have stopped (no more calls after the new timer started)
    });

    it('should handle multiple rooms independently', () => {
      const onTick1 = vi.fn();
      const onComplete1 = vi.fn();
      const onTick2 = vi.fn();
      const onComplete2 = vi.fn();

      timerManager.startTimer('room1', 3, onTick1, onComplete1);
      timerManager.startTimer('room2', 5, onTick2, onComplete2);

      vi.advanceTimersByTime(3000);

      expect(onComplete1).toHaveBeenCalledTimes(1);
      expect(onComplete2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(onComplete2).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopTimer', () => {
    it('should stop the timer for a room', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 10, onTick, onComplete);
      vi.advanceTimersByTime(2000);

      const callCountBefore = onTick.mock.calls.length;
      timerManager.stopTimer('room1');

      vi.advanceTimersByTime(5000);

      // Should not have any more calls
      expect(onTick.mock.calls.length).toBe(callCountBefore);
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should do nothing if room has no timer', () => {
      // Should not throw
      expect(() => timerManager.stopTimer('nonexistent')).not.toThrow();
    });

    it('should allow starting a new timer after stopping', () => {
      const onTick1 = vi.fn();
      const onComplete1 = vi.fn();

      timerManager.startTimer('room1', 10, onTick1, onComplete1);
      timerManager.stopTimer('room1');

      const onTick2 = vi.fn();
      const onComplete2 = vi.fn();

      timerManager.startTimer('room1', 5, onTick2, onComplete2);
      vi.advanceTimersByTime(5000);

      expect(onComplete2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRemaining', () => {
    it('should return the remaining time for an active timer', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 10, onTick, onComplete);
      vi.advanceTimersByTime(3000);

      expect(timerManager.getRemaining('room1')).toBe(7);
    });

    it('should return 0 for non-existent room', () => {
      expect(timerManager.getRemaining('nonexistent')).toBe(0);
    });

    it('should return 0 after timer completes', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 3, onTick, onComplete);
      vi.advanceTimersByTime(3000);

      expect(timerManager.getRemaining('room1')).toBe(0);
    });
  });

  describe('isRunning', () => {
    it('should return true for an active timer', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 10, onTick, onComplete);

      expect(timerManager.isRunning('room1')).toBe(true);
    });

    it('should return false for non-existent room', () => {
      expect(timerManager.isRunning('nonexistent')).toBe(false);
    });

    it('should return false after timer is stopped', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 10, onTick, onComplete);
      timerManager.stopTimer('room1');

      expect(timerManager.isRunning('room1')).toBe(false);
    });

    it('should return false after timer completes', () => {
      const onTick = vi.fn();
      const onComplete = vi.fn();

      timerManager.startTimer('room1', 2, onTick, onComplete);
      vi.advanceTimersByTime(2000);

      expect(timerManager.isRunning('room1')).toBe(false);
    });
  });
});
