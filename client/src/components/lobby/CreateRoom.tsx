import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

interface CreateRoomProps {
  onBack: () => void;
}

export function CreateRoom({ onBack }: CreateRoomProps) {
  const [playerName, setPlayerName] = useState('');
  const { createRoom } = useGame();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      createRoom(playerName.trim());
    }
  };

  return (
    <div className="create-room">
      <h2>Create Room</h2>
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
        <div className="button-group">
          <button type="button" onClick={onBack} className="secondary">
            Back
          </button>
          <button type="submit" disabled={!playerName.trim()}>
            Create Room
          </button>
        </div>
      </form>
    </div>
  );
}
