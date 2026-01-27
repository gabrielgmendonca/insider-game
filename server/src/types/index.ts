export type Role = 'MASTER' | 'INSIDER' | 'COMMON';

export type GamePhase =
  | 'WAITING'
  | 'ROLE_REVEAL'
  | 'WORD_REVEAL'
  | 'QUESTION'
  | 'DISCUSSION'
  | 'INITIAL_VOTE'
  | 'VOTING'
  | 'RESULTS';

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  isHost: boolean;
  connected: boolean;
  disconnectedAt?: number;
}

export interface Question {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  answer: 'YES' | 'NO' | 'I_DONT_KNOW' | null;
  isGuess: boolean;
  guessCorrect?: boolean;
  pendingMasterApproval?: boolean;
  guessedWord?: string;
}

export interface GameState {
  phase: GamePhase;
  secretWord: string | null;
  masterId: string | null;
  insiderId: string | null;
  questions: Question[];
  timerRemaining: number;
  votes: Record<string, string>;
  initialVotes: Record<string, boolean>;
  winner: 'INSIDER' | 'COMMONS' | null;
  wordGuessedBy: string | null;
}

export interface Room {
  code: string;
  players: Map<string, Player>;
  gameState: GameState;
  hostId: string;
}

export interface RoomInfo {
  code: string;
  players: PlayerInfo[];
  gameState: PublicGameState;
  hostId: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  role: Role | null;
  isHost: boolean;
  connected: boolean;
}

export interface PublicGameState {
  phase: GamePhase;
  secretWord: string | null;
  masterId: string | null;
  insiderId: string | null;
  questions: Question[];
  timerRemaining: number;
  votes: Record<string, string>;
  initialVotes: Record<string, boolean>;
  winner: 'INSIDER' | 'COMMONS' | null;
  wordGuessedBy: string | null;
  voteCounts?: Record<string, number>;
  initialVoteResult?: { yesCount: number; noCount: number; guesserIsInsider: boolean };
}

// Socket Events
export interface ServerToClientEvents {
  room_created: (data: { roomCode: string }) => void;
  room_joined: (data: { room: RoomInfo; playerId: string }) => void;
  player_joined: (data: { player: PlayerInfo }) => void;
  player_left: (data: { playerId: string }) => void;
  player_reconnected: (data: { playerId: string }) => void;
  role_assigned: (data: { role: Role }) => void;
  word_revealed: (data: { word: string }) => void;
  phase_changed: (data: { phase: GamePhase; timerRemaining: number }) => void;
  game_state_update: (data: { gameState: PublicGameState }) => void;
  timer_update: (data: { remaining: number }) => void;
  question_asked: (data: { question: Question }) => void;
  question_answered: (data: { questionId: string; answer: 'YES' | 'NO' | 'I_DONT_KNOW' }) => void;
  initial_vote_result: (data: { yesCount: number; noCount: number; guesserIsInsider: boolean }) => void;
  guess_pending_approval: (data: { questionId: string; playerId: string; playerName: string; word: string }) => void;
  guess_approved: (data: { questionId: string; approved: boolean }) => void;
  word_guessed: (data: { playerId: string; playerName: string; word: string; correct: boolean }) => void;
  vote_received: (data: { voterId: string; votedCount: number }) => void;
  game_ended: (data: { winner: 'INSIDER' | 'COMMONS'; insiderId: string; votes: Record<string, number>; reason: string }) => void;
  error: (data: { message: string }) => void;
  host_changed: (data: { newHostId: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { playerName: string }) => void;
  join_room: (data: { roomCode: string; playerName: string }) => void;
  leave_room: () => void;
  start_game: () => void;
  ask_question: (data: { text: string }) => void;
  answer_question: (data: { questionId: string; answer: 'YES' | 'NO' | 'I_DONT_KNOW' }) => void;
  submit_initial_vote: (data: { votesYes: boolean }) => void;
  approve_guess: (data: { questionId: string; approved: boolean }) => void;
  guess_word: (data: { word: string }) => void;
  submit_vote: (data: { votedPlayerId: string }) => void;
  reconnect_to_room: (data: { roomCode: string; playerId: string }) => void;
}
