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

export interface PlayerInfo {
  id: string;
  name: string;
  role: Role | null;
  isHost: boolean;
  connected: boolean;
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

export interface RoomInfo {
  code: string;
  players: PlayerInfo[];
  gameState: PublicGameState;
  hostId: string;
}
