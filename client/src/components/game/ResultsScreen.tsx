import { useGame } from '../../context/GameContext';

export function ResultsScreen() {
  const { room, secretWord, leaveRoom } = useGame();

  const gameState = room?.gameState;
  const players = room?.players || [];
  const winner = gameState?.winner;
  const insiderId = gameState?.insiderId;
  const masterId = gameState?.masterId;
  const voteCounts = gameState?.voteCounts || {};

  const insider = players.find(p => p.id === insiderId);
  const master = players.find(p => p.id === masterId);

  const sortedPlayers = [...players]
    .filter(p => p.id !== masterId)
    .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));

  return (
    <div className="results-screen">
      <h2>Game Over</h2>

      <div className={`winner-banner ${winner?.toLowerCase()}`}>
        <h3>{winner === 'INSIDER' ? 'Insider Wins!' : 'Commons Win!'}</h3>
      </div>

      <div className="word-reveal-section">
        <p>The secret word was:</p>
        <h3 className="secret-word">{secretWord || gameState?.secretWord}</h3>
      </div>

      <div className="roles-reveal">
        <h4>Roles</h4>
        <div className="role-cards">
          <div className="role-card master">
            <span className="role-label">Master</span>
            <span className="player-name">{master?.name}</span>
          </div>
          <div className="role-card insider">
            <span className="role-label">Insider</span>
            <span className="player-name">{insider?.name}</span>
          </div>
        </div>
      </div>

      {Object.keys(voteCounts).length > 0 && (
        <div className="vote-results">
          <h4>Vote Results</h4>
          <div className="vote-list">
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                className={`vote-item ${player.id === insiderId ? 'insider' : ''}`}
              >
                <span className="player-name">
                  {player.name}
                  {player.id === insiderId && <span className="insider-badge">INSIDER</span>}
                </span>
                <span className="vote-count">{voteCounts[player.id] || 0} votes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={leaveRoom} className="leave-button">
        Leave Room
      </button>
    </div>
  );
}
