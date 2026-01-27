import { Role } from '../../types';
import { Timer } from './Timer';

interface WordRevealProps {
  role: Role | null;
  secretWord: string | null;
  timerRemaining: number;
}

export function WordReveal({ role, secretWord, timerRemaining }: WordRevealProps) {
  const canSeeWord = role === 'MASTER' || role === 'INSIDER';

  return (
    <div className="word-reveal">
      <Timer seconds={timerRemaining} />
      <h2>The Secret Word</h2>
      {canSeeWord ? (
        <div className="word-card">
          <span className="secret-word">{secretWord}</span>
          <p className="hint">
            {role === 'MASTER'
              ? 'You will answer questions about this word'
              : 'Guide others to this word without being caught'}
          </p>
        </div>
      ) : (
        <div className="word-card hidden">
          <span className="secret-word">???</span>
          <p className="hint">Only the Master and Insider know the word</p>
        </div>
      )}
    </div>
  );
}
