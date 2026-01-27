interface TimerProps {
  seconds: number;
  warning?: number;
}

export function Timer({ seconds, warning = 30 }: TimerProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const isWarning = seconds <= warning && seconds > 0;
  const isCritical = seconds <= 10 && seconds > 0;

  return (
    <div className={`timer ${isWarning ? 'warning' : ''} ${isCritical ? 'critical' : ''}`}>
      <span className="timer-value">
        {minutes}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
