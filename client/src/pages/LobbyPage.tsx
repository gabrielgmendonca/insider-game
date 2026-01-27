import { useGame } from '../context/GameContext';
import { PlayerList } from '../components/lobby';

export function LobbyPage() {
  const { room, playerId, isHost, startGame, leaveRoom } = useGame();

  if (!room) return null;

  const canStart = room.players.length >= 4 && room.players.length <= 8;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <div className="lobby-page">
      <h2>Game Lobby</h2>

      <div className="room-code-section">
        <span className="label">Room Code:</span>
        <span className="room-code">{room.code}</span>
        <button onClick={copyRoomCode} className="copy-button">
          Copy
        </button>
      </div>

      <PlayerList
        players={room.players}
        hostId={room.hostId}
        currentPlayerId={playerId}
      />

      <div className="lobby-actions">
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="start-button"
          >
            {canStart ? 'Start Game' : `Need ${4 - room.players.length} more player${4 - room.players.length === 1 ? '' : 's'}`}
          </button>
        ) : (
          <p className="waiting-message">Waiting for host to start the game...</p>
        )}

        <button onClick={leaveRoom} className="secondary leave-button">
          Leave Room
        </button>
      </div>
    </div>
  );
}
