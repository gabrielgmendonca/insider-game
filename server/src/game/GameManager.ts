import { Server } from 'socket.io';
import { Room, GamePhase, Question, Role, ServerToClientEvents, ClientToServerEvents } from '../types/index.js';
import { roomManager } from './RoomManager.js';
import { timerManager } from './TimerManager.js';
import { wordBank } from './WordBank.js';

const PHASE_DURATIONS: Partial<Record<GamePhase, number>> = {
  ROLE_REVEAL: 5,
  WORD_REVEAL: 5,
  QUESTION: 300,
  DISCUSSION: 300,
  INITIAL_VOTE: 30,
  VOTING: 30,
};

export class GameManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  startGame(roomCode: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.players.size < 4 || room.players.size > 8) return false;

    if (room.gameState.phase !== 'WAITING') return false;

    this.assignRoles(room);
    this.assignWord(room);
    this.transitionToPhase(room, 'ROLE_REVEAL');

    return true;
  }

  private assignRoles(room: Room): void {
    const playerIds = Array.from(room.players.keys());
    const shuffled = this.shuffle([...playerIds]);

    room.gameState.masterId = shuffled[0];
    room.gameState.insiderId = shuffled[1];

    room.players.get(shuffled[0])!.role = 'MASTER';
    room.players.get(shuffled[1])!.role = 'INSIDER';

    for (let i = 2; i < shuffled.length; i++) {
      room.players.get(shuffled[i])!.role = 'COMMON';
    }

    for (const [playerId, player] of room.players) {
      this.io.to(playerId).emit('role_assigned', { role: player.role! });
    }
  }

  private assignWord(room: Room): void {
    room.gameState.secretWord = wordBank.getRandomWord();
  }

  private transitionToPhase(room: Room, phase: GamePhase): void {
    room.gameState.phase = phase;
    const duration = PHASE_DURATIONS[phase] || 0;
    room.gameState.timerRemaining = duration;

    this.io.to(room.code).emit('phase_changed', { phase, timerRemaining: duration });

    if (phase === 'WORD_REVEAL') {
      const masterId = room.gameState.masterId!;
      const insiderId = room.gameState.insiderId!;
      const word = room.gameState.secretWord!;

      this.io.to(masterId).emit('word_revealed', { word });
      this.io.to(insiderId).emit('word_revealed', { word });
    }

    this.broadcastGameState(room);

    if (duration > 0) {
      timerManager.startTimer(
        room.code,
        duration,
        (remaining) => {
          room.gameState.timerRemaining = remaining;
          this.io.to(room.code).emit('timer_update', { remaining });
        },
        () => this.onTimerComplete(room.code)
      );
    }
  }

  private onTimerComplete(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const nextPhase = this.getNextPhase(room.gameState.phase, room);
    if (nextPhase) {
      this.transitionToPhase(room, nextPhase);
    }
  }

  private getNextPhase(currentPhase: GamePhase, room: Room): GamePhase | null {
    switch (currentPhase) {
      case 'ROLE_REVEAL':
        return 'WORD_REVEAL';
      case 'WORD_REVEAL':
        return 'QUESTION';
      case 'QUESTION':
        this.endGame(room, 'INSIDER', 'Time ran out without guessing the word');
        return null;
      case 'DISCUSSION':
        return 'INITIAL_VOTE';
      case 'INITIAL_VOTE':
        this.tallyInitialVotesAndContinue(room);
        return null;
      case 'VOTING':
        this.tallyVotesAndEnd(room);
        return null;
      default:
        return null;
    }
  }

  askQuestion(roomCode: string, playerId: string, text: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'QUESTION') return false;

    if (playerId === room.gameState.masterId) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    const question: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: player.name,
      text,
      answer: null,
      isGuess: false,
    };

    room.gameState.questions.push(question);
    this.io.to(room.code).emit('question_asked', { question });

    return true;
  }

  answerQuestion(roomCode: string, playerId: string, questionId: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW'): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'QUESTION') return false;

    if (playerId !== room.gameState.masterId) return false;

    const question = room.gameState.questions.find(q => q.id === questionId);
    if (!question) return false;

    if (question.answer !== null) return false;

    question.answer = answer;
    this.io.to(room.code).emit('question_answered', { questionId, answer });

    return true;
  }

  guessWord(roomCode: string, playerId: string, word: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'QUESTION') return false;

    if (playerId === room.gameState.masterId) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    const normalizedGuess = word.toLowerCase().trim();
    const normalizedSecret = room.gameState.secretWord!.toLowerCase().trim();
    const exactMatch = normalizedGuess === normalizedSecret;

    const question: Question = {
      id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: player.name,
      text: `Guessed: "${word}"`,
      answer: exactMatch ? 'YES' : null,
      isGuess: true,
      guessCorrect: exactMatch ? true : undefined,
      pendingMasterApproval: !exactMatch,
      guessedWord: word,
    };

    room.gameState.questions.push(question);

    if (exactMatch) {
      this.io.to(room.code).emit('word_guessed', {
        playerId,
        playerName: player.name,
        word,
        correct: true,
      });

      room.gameState.wordGuessedBy = playerId;
      timerManager.stopTimer(roomCode);
      this.transitionToPhase(room, 'DISCUSSION');
    } else {
      this.io.to(room.code).emit('guess_pending_approval', {
        questionId: question.id,
        playerId,
        playerName: player.name,
        word,
      });
    }

    return true;
  }

  approveGuess(roomCode: string, masterId: string, questionId: string, approved: boolean): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'QUESTION') return false;

    if (masterId !== room.gameState.masterId) return false;

    const question = room.gameState.questions.find(q => q.id === questionId);
    if (!question || !question.pendingMasterApproval) return false;

    question.pendingMasterApproval = false;
    question.answer = approved ? 'YES' : 'NO';
    question.guessCorrect = approved;

    this.io.to(room.code).emit('guess_approved', { questionId, approved });

    this.io.to(room.code).emit('word_guessed', {
      playerId: question.playerId,
      playerName: question.playerName,
      word: question.guessedWord!,
      correct: approved,
    });

    if (approved) {
      room.gameState.wordGuessedBy = question.playerId;
      timerManager.stopTimer(roomCode);
      this.transitionToPhase(room, 'DISCUSSION');
    }

    return true;
  }

  submitVote(roomCode: string, voterId: string, votedPlayerId: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'VOTING') return false;

    if (voterId === room.gameState.masterId) return false;

    if (!room.players.has(votedPlayerId)) return false;

    if (votedPlayerId === room.gameState.masterId) return false;

    room.gameState.votes[voterId] = votedPlayerId;

    const votedCount = Object.keys(room.gameState.votes).length;
    this.io.to(room.code).emit('vote_received', { voterId, votedCount });

    const eligibleVoters = Array.from(room.players.keys()).filter(
      id => id !== room.gameState.masterId
    );

    if (votedCount >= eligibleVoters.length) {
      timerManager.stopTimer(roomCode);
      this.tallyVotesAndEnd(room);
    }

    return true;
  }

  submitInitialVote(roomCode: string, voterId: string, votesYes: boolean): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    if (room.gameState.phase !== 'INITIAL_VOTE') return false;

    room.gameState.initialVotes[voterId] = votesYes;

    const votedCount = Object.keys(room.gameState.initialVotes).length;
    const totalPlayers = room.players.size;

    this.io.to(room.code).emit('vote_received', { voterId, votedCount });

    if (votedCount >= totalPlayers) {
      timerManager.stopTimer(roomCode);
      this.tallyInitialVotesAndContinue(room);
    }

    return true;
  }

  private tallyInitialVotesAndContinue(room: Room): void {
    const guesser = room.gameState.wordGuessedBy;
    if (!guesser) {
      this.transitionToPhase(room, 'VOTING');
      return;
    }

    let yesCount = 0;
    let noCount = 0;

    for (const votesYes of Object.values(room.gameState.initialVotes)) {
      if (votesYes) {
        yesCount++;
      } else {
        noCount++;
      }
    }

    const guesserIsInsider = guesser === room.gameState.insiderId;

    this.io.to(room.code).emit('initial_vote_result', {
      yesCount,
      noCount,
      guesserIsInsider,
    });

    if (yesCount > noCount) {
      if (guesserIsInsider) {
        this.endGame(room, 'COMMONS', 'The guesser was correctly identified as the Insider');
      } else {
        this.endGame(room, 'INSIDER', 'The guesser was wrongly accused - they were not the Insider');
      }
    } else {
      this.transitionToPhase(room, 'VOTING');
    }
  }

  private tallyVotesAndEnd(room: Room): void {
    const voteCounts: Record<string, number> = {};

    for (const votedId of Object.values(room.gameState.votes)) {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    }

    let maxVotes = 0;
    let mostVotedId: string | null = null;

    for (const [playerId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = playerId;
      }
    }

    const insiderCaught = mostVotedId === room.gameState.insiderId;

    if (insiderCaught) {
      this.endGame(room, 'COMMONS', 'The Insider was correctly identified');
    } else {
      this.endGame(room, 'INSIDER', 'The Insider was not identified');
    }
  }

  private endGame(room: Room, winner: 'INSIDER' | 'COMMONS', reason: string): void {
    room.gameState.winner = winner;
    room.gameState.phase = 'RESULTS';

    const voteCounts: Record<string, number> = {};
    for (const votedId of Object.values(room.gameState.votes)) {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    }

    this.io.to(room.code).emit('game_ended', {
      winner,
      insiderId: room.gameState.insiderId!,
      votes: voteCounts,
      reason,
    });

    this.broadcastGameState(room);
  }

  resetGame(roomCode: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;

    timerManager.stopTimer(roomCode);

    room.gameState = {
      phase: 'WAITING',
      secretWord: null,
      masterId: null,
      insiderId: null,
      questions: [],
      timerRemaining: 0,
      votes: {},
      initialVotes: {},
      winner: null,
      wordGuessedBy: null,
    };

    for (const player of room.players.values()) {
      player.role = null;
    }

    this.broadcastGameState(room);
    return true;
  }

  private broadcastGameState(room: Room): void {
    for (const playerId of room.players.keys()) {
      const roomInfo = roomManager.toRoomInfo(room, playerId);
      this.io.to(playerId).emit('game_state_update', { gameState: roomInfo.gameState });
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
