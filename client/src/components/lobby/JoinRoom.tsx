import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

interface JoinRoomProps {
  onBack: () => void;
}

export function JoinRoom({ onBack }: JoinRoomProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { joinRoom } = useGame();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomCode.trim()) {
      joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="join-room">
      <h2>Join Room</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="playerName">Your Name</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="roomCode">Room Code</label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter 4-letter code"
            maxLength={4}
          />
        </div>
        <div className="button-group">
          <button type="button" onClick={onBack} className="secondary">
            Back
          </button>
          <button type="submit" disabled={!playerName.trim() || roomCode.length !== 4}>
            Join Room
          </button>
        </div>
      </form>
    </div>
  );
}
