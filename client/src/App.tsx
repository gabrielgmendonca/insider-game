import { useEffect } from 'react';
import { useGame } from './context/GameContext';
import { HomePage, LobbyPage, GamePage } from './pages';
import './App.css';

export function App() {
  const { room, error, clearError } = useGame();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const renderPage = () => {
    if (!room) {
      return <HomePage />;
    }

    if (room.gameState.phase === 'WAITING') {
      return <LobbyPage />;
    }

    return <GamePage />;
  };

  return (
    <div className="app">
      {error && (
        <div className="error-toast" onClick={clearError}>
          {error}
        </div>
      )}
      {renderPage()}
    </div>
  );
}
