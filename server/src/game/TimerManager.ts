type TimerCallback = (remaining: number) => void;
type TimerCompleteCallback = () => void;

interface ActiveTimer {
  interval: NodeJS.Timeout;
  remaining: number;
  onTick: TimerCallback;
  onComplete: TimerCompleteCallback;
}

export class TimerManager {
  private timers: Map<string, ActiveTimer> = new Map();

  startTimer(
    roomCode: string,
    durationSeconds: number,
    onTick: TimerCallback,
    onComplete: TimerCompleteCallback
  ): void {
    this.stopTimer(roomCode);

    const timer: ActiveTimer = {
      interval: setInterval(() => {
        timer.remaining -= 1;
        timer.onTick(timer.remaining);

        if (timer.remaining <= 0) {
          this.stopTimer(roomCode);
          timer.onComplete();
        }
      }, 1000),
      remaining: durationSeconds,
      onTick,
      onComplete,
    };

    this.timers.set(roomCode, timer);
    onTick(durationSeconds);
  }

  stopTimer(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearInterval(timer.interval);
      this.timers.delete(roomCode);
    }
  }

  getRemaining(roomCode: string): number {
    const timer = this.timers.get(roomCode);
    return timer?.remaining ?? 0;
  }

  isRunning(roomCode: string): boolean {
    return this.timers.has(roomCode);
  }
}

export const timerManager = new TimerManager();
