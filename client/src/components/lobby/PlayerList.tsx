import { PlayerInfo } from '../../types';

interface PlayerListProps {
  players: PlayerInfo[];
  hostId: string;
  currentPlayerId: string | null;
}

export function PlayerList({ players, hostId, currentPlayerId }: PlayerListProps) {
  return (
    <div className="player-list">
      <h3>Players ({players.length}/6)</h3>
      <ul>
        {players.map((player) => (
          <li
            key={player.id}
            className={`player-item ${!player.connected ? 'disconnected' : ''} ${player.id === currentPlayerId ? 'current' : ''}`}
          >
            <span className="player-name">{player.name}</span>
            <span className="player-badges">
              {player.id === hostId && <span className="badge host">Host</span>}
              {player.id === currentPlayerId && <span className="badge you">You</span>}
              {!player.connected && <span className="badge offline">Offline</span>}
            </span>
          </li>
        ))}
        {Array.from({ length: 6 - players.length }).map((_, i) => (
          <li key={`empty-${i}`} className="player-item empty">
            <span className="player-name">Waiting for player...</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
