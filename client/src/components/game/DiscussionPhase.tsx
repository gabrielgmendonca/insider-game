import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function DiscussionPhase() {
  const { room, secretWord } = useGame();
  const gameState = room?.gameState;
  const wordGuessedBy = gameState?.wordGuessedBy;
  const guesser = room?.players.find(p => p.id === wordGuessedBy);

  return (
    <div className="discussion-phase">
      <div className="phase-header">
        <Timer seconds={gameState?.timerRemaining || 0} />
        <h2>Discussion Phase</h2>
      </div>

      <div className="discussion-content">
        <div className="word-guessed">
          <p>The word was:</p>
          <h3 className="secret-word">{secretWord || gameState?.secretWord}</h3>
          {guesser && (
            <p className="guesser">Guessed by: <strong>{guesser.name}</strong></p>
          )}
        </div>

        <div className="discussion-info">
          <h4>Find the Insider!</h4>
          <p>
            One player among you is the Insider - they knew the word from the start.
            Discuss who you think it is. Voting starts when the timer ends.
          </p>
          <p className="hint">
            Think about: Who asked suspiciously helpful questions? Who seemed to guide the guessing?
          </p>
        </div>
      </div>
    </div>
  );
}
