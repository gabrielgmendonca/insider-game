import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';

export function VotingPhase() {
  const { room, playerId, isMaster, submitVote } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const gameState = room?.gameState;
  const players = room?.players || [];
  const masterId = gameState?.masterId;

  const eligiblePlayers = players.filter(p => p.id !== masterId);

  const handleVote = () => {
    if (selectedPlayer && !hasVoted && !isMaster) {
      submitVote(selectedPlayer);
      setHasVoted(true);
    }
  };

  if (isMaster) {
    return (
      <div className="voting-phase">
        <div className="phase-header">
          <Timer seconds={gameState?.timerRemaining || 0} />
          <h2>Voting Phase</h2>
        </div>
        <div className="master-waiting">
          <p>As the Master, you cannot vote.</p>
          <p>Wait for the other players to vote for the Insider.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-phase">
      <div className="phase-header">
        <Timer seconds={gameState?.timerRemaining || 0} />
        <h2>Vote for the Insider</h2>
      </div>

      {hasVoted ? (
        <div className="voted-message">
          <p>Your vote has been submitted!</p>
          <p>Waiting for other players...</p>
        </div>
      ) : (
        <>
          <div className="player-cards">
            {eligiblePlayers.map((player) => (
              <button
                key={player.id}
                className={`player-card ${selectedPlayer === player.id ? 'selected' : ''} ${player.id === playerId ? 'self' : ''}`}
                onClick={() => setSelectedPlayer(player.id)}
                disabled={player.id === playerId}
              >
                <span className="player-name">{player.name}</span>
                {player.id === playerId && <span className="self-badge">You</span>}
              </button>
            ))}
          </div>

          <button
            className="submit-vote-button"
            onClick={handleVote}
            disabled={!selectedPlayer}
          >
            Submit Vote
          </button>
        </>
      )}
    </div>
  );
}
