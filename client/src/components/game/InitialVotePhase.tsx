import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function InitialVotePhase() {
  const { room, submitInitialVote } = useGame();
  const [hasVoted, setHasVoted] = useState(false);

  const gameState = room?.gameState;
  const players = room?.players || [];
  const guesser = players.find(p => p.id === gameState?.wordGuessedBy);

  const handleVote = (votesYes: boolean) => {
    if (!hasVoted) {
      submitInitialVote(votesYes);
      setHasVoted(true);
    }
  };

  return (
    <div className="initial-vote-phase">
      <div className="phase-header">
        <Timer seconds={gameState?.timerRemaining || 0} />
        <h2>Initial Vote</h2>
      </div>

      <div className="vote-question">
        <p>
          <strong>{guesser?.name || 'Someone'}</strong> guessed the word correctly.
        </p>
        <p>Do you think they are the Insider?</p>
      </div>

      {hasVoted ? (
        <div className="voted-message">
          <p>Your vote has been submitted!</p>
          <p>Waiting for other players...</p>
        </div>
      ) : (
        <div className="vote-buttons">
          <button
            className="vote-yes"
            onClick={() => handleVote(true)}
          >
            Yes, they're the Insider
          </button>
          <button
            className="vote-no"
            onClick={() => handleVote(false)}
          >
            No, keep looking
          </button>
        </div>
      )}
    </div>
  );
}
