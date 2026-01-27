import { useState } from 'react';
import { CreateRoom, JoinRoom } from '../components/lobby';
import { useSocket } from '../context/SocketContext';

type View = 'menu' | 'create' | 'join';

export function HomePage() {
  const [view, setView] = useState<View>('menu');
  const { isConnected } = useSocket();

  if (!isConnected) {
    return (
      <div className="home-page">
        <h1>Insider</h1>
        <p className="connecting">Connecting to server...</p>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="home-page">
        <h1>Insider</h1>
        <CreateRoom onBack={() => setView('menu')} />
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="home-page">
        <h1>Insider</h1>
        <JoinRoom onBack={() => setView('menu')} />
      </div>
    );
  }

  return (
    <div className="home-page">
      <h1>Insider</h1>
      <p className="subtitle">A social deduction game for 4-8 players</p>

      <div className="menu-buttons">
        <button onClick={() => setView('create')}>Create Room</button>
        <button onClick={() => setView('join')} className="secondary">
          Join Room
        </button>
      </div>

      <div className="game-info">
        <h3>How to Play</h3>
        <ul>
          <li><strong>Master</strong> - Knows the word, answers questions</li>
          <li><strong>Insider</strong> - Knows the word, hides among Commons</li>
          <li><strong>Commons</strong> - Ask questions, guess the word, find the Insider</li>
        </ul>
      </div>
    </div>
  );
}
