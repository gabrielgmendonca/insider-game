import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { RoomInfo, PlayerInfo, PublicGameState, Role, Question, GamePhase } from '../types';

interface GameContextState {
  room: RoomInfo | null;
  playerId: string | null;
  myRole: Role | null;
  secretWord: string | null;
  error: string | null;
}

type GameAction =
  | { type: 'SET_ROOM'; payload: { room: RoomInfo; playerId: string } }
  | { type: 'PLAYER_JOINED'; payload: PlayerInfo }
  | { type: 'PLAYER_LEFT'; payload: string }
  | { type: 'PLAYER_RECONNECTED'; payload: string }
  | { type: 'HOST_CHANGED'; payload: string }
  | { type: 'ROLE_ASSIGNED'; payload: Role }
  | { type: 'WORD_REVEALED'; payload: string }
  | { type: 'PHASE_CHANGED'; payload: { phase: GamePhase; timerRemaining: number } }
  | { type: 'GAME_STATE_UPDATE'; payload: PublicGameState }
  | { type: 'TIMER_UPDATE'; payload: number }
  | { type: 'QUESTION_ASKED'; payload: Question }
  | { type: 'QUESTION_ANSWERED'; payload: { questionId: string; answer: 'YES' | 'NO' | 'I_DONT_KNOW' } }
  | { type: 'GUESS_PENDING'; payload: { questionId: string; playerId: string; playerName: string; word: string } }
  | { type: 'GUESS_APPROVED'; payload: { questionId: string; approved: boolean } }
  | { type: 'VOTE_RECEIVED'; payload: { voterId: string; votedCount: number } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LEAVE_ROOM' };

const initialState: GameContextState = {
  room: null,
  playerId: null,
  myRole: null,
  secretWord: null,
  error: null,
};

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_ROOM':
      return {
        ...state,
        room: action.payload.room,
        playerId: action.payload.playerId,
        error: null,
      };

    case 'PLAYER_JOINED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: [...state.room.players, action.payload],
        },
      };

    case 'PLAYER_LEFT':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.filter(p => p.id !== action.payload),
        },
      };

    case 'PLAYER_RECONNECTED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map(p =>
            p.id === action.payload ? { ...p, connected: true } : p
          ),
        },
      };

    case 'HOST_CHANGED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          hostId: action.payload,
          players: state.room.players.map(p => ({
            ...p,
            isHost: p.id === action.payload,
          })),
        },
      };

    case 'ROLE_ASSIGNED':
      return {
        ...state,
        myRole: action.payload,
      };

    case 'WORD_REVEALED':
      return {
        ...state,
        secretWord: action.payload,
      };

    case 'PHASE_CHANGED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            phase: action.payload.phase,
            timerRemaining: action.payload.timerRemaining,
          },
        },
      };

    case 'GAME_STATE_UPDATE':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: action.payload,
        },
        secretWord: action.payload.secretWord || state.secretWord,
      };

    case 'TIMER_UPDATE':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            timerRemaining: action.payload,
          },
        },
      };

    case 'QUESTION_ASKED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            questions: [...state.room.gameState.questions, action.payload],
          },
        },
      };

    case 'QUESTION_ANSWERED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            questions: state.room.gameState.questions.map(q =>
              q.id === action.payload.questionId
                ? { ...q, answer: action.payload.answer }
                : q
            ),
          },
        },
      };

    case 'GUESS_PENDING':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            questions: state.room.gameState.questions.map(q =>
              q.id === action.payload.questionId
                ? { ...q, pendingMasterApproval: true, guessedWord: action.payload.word }
                : q
            ),
          },
        },
      };

    case 'GUESS_APPROVED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          gameState: {
            ...state.room.gameState,
            questions: state.room.gameState.questions.map(q =>
              q.id === action.payload.questionId
                ? {
                    ...q,
                    pendingMasterApproval: false,
                    answer: action.payload.approved ? 'YES' : 'NO',
                    guessCorrect: action.payload.approved,
                  }
                : q
            ),
          },
        },
      };

    case 'VOTE_RECEIVED':
      return state;

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'LEAVE_ROOM':
      return initialState;

    default:
      return state;
  }
}

interface GameContextValue extends GameContextState {
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  askQuestion: (text: string) => void;
  answerQuestion: (questionId: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW') => void;
  submitInitialVote: (votesYes: boolean) => void;
  approveGuess: (questionId: string, approved: boolean) => void;
  guessWord: (word: string) => void;
  submitVote: (votedPlayerId: string) => void;
  clearError: () => void;
  isHost: boolean;
  isMaster: boolean;
  isInsider: boolean;
  myPlayer: PlayerInfo | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_joined', ({ room, playerId }) => {
      dispatch({ type: 'SET_ROOM', payload: { room, playerId } });
    });

    socket.on('player_joined', ({ player }) => {
      dispatch({ type: 'PLAYER_JOINED', payload: player });
    });

    socket.on('player_left', ({ playerId }) => {
      dispatch({ type: 'PLAYER_LEFT', payload: playerId });
    });

    socket.on('player_reconnected', ({ playerId }) => {
      dispatch({ type: 'PLAYER_RECONNECTED', payload: playerId });
    });

    socket.on('host_changed', ({ newHostId }) => {
      dispatch({ type: 'HOST_CHANGED', payload: newHostId });
    });

    socket.on('role_assigned', ({ role }) => {
      dispatch({ type: 'ROLE_ASSIGNED', payload: role });
    });

    socket.on('word_revealed', ({ word }) => {
      dispatch({ type: 'WORD_REVEALED', payload: word });
    });

    socket.on('phase_changed', ({ phase, timerRemaining }) => {
      dispatch({ type: 'PHASE_CHANGED', payload: { phase, timerRemaining } });
    });

    socket.on('game_state_update', ({ gameState }) => {
      dispatch({ type: 'GAME_STATE_UPDATE', payload: gameState });
    });

    socket.on('timer_update', ({ remaining }) => {
      dispatch({ type: 'TIMER_UPDATE', payload: remaining });
    });

    socket.on('question_asked', ({ question }) => {
      dispatch({ type: 'QUESTION_ASKED', payload: question });
    });

    socket.on('word_guessed', ({ playerId, playerName, word, correct }) => {
      const guessQuestion: Question = {
        id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId,
        playerName,
        text: `Guessed: "${word}"`,
        answer: correct ? 'YES' : 'NO',
        isGuess: true,
        guessCorrect: correct,
      };
      dispatch({ type: 'QUESTION_ASKED', payload: guessQuestion });
    });

    socket.on('question_answered', ({ questionId, answer }) => {
      dispatch({ type: 'QUESTION_ANSWERED', payload: { questionId, answer } });
    });

    socket.on('vote_received', ({ voterId, votedCount }) => {
      dispatch({ type: 'VOTE_RECEIVED', payload: { voterId, votedCount } });
    });

    socket.on('guess_pending_approval', ({ questionId, playerId, playerName, word }) => {
      dispatch({ type: 'GUESS_PENDING', payload: { questionId, playerId, playerName, word } });
    });

    socket.on('guess_approved', ({ questionId, approved }) => {
      dispatch({ type: 'GUESS_APPROVED', payload: { questionId, approved } });
    });

    socket.on('error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', payload: message });
    });

    return () => {
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_reconnected');
      socket.off('host_changed');
      socket.off('role_assigned');
      socket.off('word_revealed');
      socket.off('phase_changed');
      socket.off('game_state_update');
      socket.off('timer_update');
      socket.off('question_asked');
      socket.off('word_guessed');
      socket.off('question_answered');
      socket.off('vote_received');
      socket.off('guess_pending_approval');
      socket.off('guess_approved');
      socket.off('error');
    };
  }, [socket]);

  const createRoom = useCallback((playerName: string) => {
    socket?.emit('create_room', { playerName });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socket?.emit('join_room', { roomCode, playerName });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket?.emit('leave_room');
    dispatch({ type: 'LEAVE_ROOM' });
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('start_game');
  }, [socket]);

  const askQuestion = useCallback((text: string) => {
    socket?.emit('ask_question', { text });
  }, [socket]);

  const answerQuestion = useCallback((questionId: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW') => {
    socket?.emit('answer_question', { questionId, answer });
  }, [socket]);

  const submitInitialVote = useCallback((votesYes: boolean) => {
    socket?.emit('submit_initial_vote', { votesYes });
  }, [socket]);

  const approveGuess = useCallback((questionId: string, approved: boolean) => {
    socket?.emit('approve_guess', { questionId, approved });
  }, [socket]);

  const guessWord = useCallback((word: string) => {
    socket?.emit('guess_word', { word });
  }, [socket]);

  const submitVote = useCallback((votedPlayerId: string) => {
    socket?.emit('submit_vote', { votedPlayerId });
  }, [socket]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const isHost = state.room?.hostId === state.playerId;
  const isMaster = state.room?.gameState.masterId === state.playerId;
  const isInsider = state.myRole === 'INSIDER';
  const myPlayer = state.room?.players.find(p => p.id === state.playerId) || null;

  const value: GameContextValue = {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    askQuestion,
    answerQuestion,
    guessWord,
    submitVote,
    submitInitialVote,
    approveGuess,
    clearError,
    isHost,
    isMaster,
    isInsider,
    myPlayer,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
