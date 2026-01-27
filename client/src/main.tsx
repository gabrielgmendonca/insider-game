import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SocketProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </SocketProvider>
  </React.StrictMode>
);
