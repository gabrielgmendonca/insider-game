import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from 'socket.io';
import { GameManager } from './GameManager.js';
import { RoomManager } from './RoomManager.js';
import { TimerManager } from './TimerManager.js';
import { WordBank } from './WordBank.js';
import { Room } from '../types/index.js';

// Mock the singleton instances
vi.mock('./RoomManager.js', async () => {
  const actual = await vi.importActual('./RoomManager.js') as object;
  return {
    ...actual,
    roomManager: new (actual as { RoomManager: typeof RoomManager }).RoomManager(),
  };
});

vi.mock('./TimerManager.js', async () => {
  const actual = await vi.importActual('./TimerManager.js') as object;
  return {
    ...actual,
    timerManager: new (actual as { TimerManager: typeof TimerManager }).TimerManager(),
  };
});

vi.mock('./WordBank.js', async () => {
  const actual = await vi.importActual('./WordBank.js') as object;
  return {
    ...actual,
    wordBank: new (actual as { WordBank: typeof WordBank }).WordBank(),
  };
});

// Helper to create room and return just the room object
function createTestRoom(rm: RoomManager, hostId: string, hostName: string): Room {
  return rm.createRoom(hostId, hostName).room;
}

function joinTestRoom(rm: RoomManager, roomCode: string, playerId: string, playerName: string): Room | null {
  const result = rm.joinRoom(roomCode, playerId, playerName);
  return result ? result.room : null;
}

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockIo: Server;
  let roomManager: RoomManager;

  beforeEach(async () => {
    vi.useFakeTimers();

    // Create fresh instances for each test
    const rmModule = await import('./RoomManager.js');
    roomManager = rmModule.roomManager;

    // Create mock Socket.io server
    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Server;

    gameManager = new GameManager(mockIo);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startGame', () => {
    it('should return false for non-existent room', () => {
      const result = gameManager.startGame('XXXX');
      expect(result).toBe(false);
    });

    it('should return false if less than 4 players', () => {
      const room = createTestRoom(roomManager, 'host1', 'Host');
      joinTestRoom(roomManager, room.code, 'player2', 'Player 2');
      joinTestRoom(roomManager, room.code, 'player3', 'Player 3');
      // Only 3 players

      const result = gameManager.startGame(room.code);
      expect(result).toBe(false);
    });

    it('should return false if more than 8 players', () => {
      const room = createTestRoom(roomManager, 'host1', 'Host');
      // Force add more than 8 players by manipulating the map
      for (let i = 2; i <= 9; i++) {
        room.players.set(`player${i}`, {
          id: `player${i}`,
          name: `Player ${i}`,
          role: null,
          isHost: false,
          connected: true,
          reconnectToken: `token${i}`,
        });
      }

      const result = gameManager.startGame(room.code);
      expect(result).toBe(false);
    });

    it('should return false if game not in WAITING phase', () => {
      const room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      room.gameState.phase = 'QUESTION';

      const result = gameManager.startGame(room.code);
      expect(result).toBe(false);
    });

    it('should start game with 4 players and assign roles', () => {
      const room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }

      const result = gameManager.startGame(room.code);

      expect(result).toBe(true);
      expect(room.gameState.phase).toBe('ROLE_REVEAL');
      expect(room.gameState.masterId).not.toBeNull();
      expect(room.gameState.insiderId).not.toBeNull();
      expect(room.gameState.secretWord).not.toBeNull();

      // Verify exactly one master, one insider, and rest commons
      const roles = Array.from(room.players.values()).map(p => p.role);
      expect(roles.filter(r => r === 'MASTER').length).toBe(1);
      expect(roles.filter(r => r === 'INSIDER').length).toBe(1);
      expect(roles.filter(r => r === 'COMMON').length).toBe(2);
    });

    it('should emit role_assigned to each player', () => {
      const room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }

      gameManager.startGame(room.code);

      // Should have emitted role_assigned 4 times (once per player)
      const roleAssignedCalls = (mockIo.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === 'role_assigned'
      );
      expect(roleAssignedCalls.length).toBe(4);
    });
  });

  describe('askQuestion', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'QUESTION';
    });

    it('should allow non-master to ask questions', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.askQuestion(room.code, nonMasterId, 'Is it an animal?');

      expect(result).toBe(true);
      expect(room.gameState.questions.length).toBe(1);
      expect(room.gameState.questions[0].text).toBe('Is it an animal?');
      expect(room.gameState.questions[0].answer).toBeNull();
    });

    it('should not allow master to ask questions', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.askQuestion(room.code, masterId, 'Is it an animal?');

      expect(result).toBe(false);
      expect(room.gameState.questions.length).toBe(0);
    });

    it('should return false if not in QUESTION phase', () => {
      room.gameState.phase = 'DISCUSSION';

      const result = gameManager.askQuestion(room.code, 'player2', 'Is it an animal?');

      expect(result).toBe(false);
    });

    it('should emit question_asked event', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      gameManager.askQuestion(room.code, nonMasterId, 'Is it an animal?');

      expect(mockIo.emit).toHaveBeenCalledWith('question_asked', expect.objectContaining({
        question: expect.objectContaining({
          text: 'Is it an animal?',
        }),
      }));
    });
  });

  describe('answerQuestion', () => {
    let room: Room;
    let questionId: string;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'QUESTION';

      // Add a question
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';
      gameManager.askQuestion(room.code, nonMasterId, 'Is it an animal?');
      questionId = room.gameState.questions[0].id;
    });

    it('should allow master to answer questions', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.answerQuestion(room.code, masterId, questionId, 'YES');

      expect(result).toBe(true);
      expect(room.gameState.questions[0].answer).toBe('YES');
    });

    it('should not allow non-master to answer questions', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.answerQuestion(room.code, nonMasterId, questionId, 'YES');

      expect(result).toBe(false);
      expect(room.gameState.questions[0].answer).toBeNull();
    });

    it('should not allow answering already answered question', () => {
      const masterId = room.gameState.masterId!;
      gameManager.answerQuestion(room.code, masterId, questionId, 'YES');

      const result = gameManager.answerQuestion(room.code, masterId, questionId, 'NO');

      expect(result).toBe(false);
      expect(room.gameState.questions[0].answer).toBe('YES');
    });

    it('should emit question_answered event', () => {
      const masterId = room.gameState.masterId!;

      gameManager.answerQuestion(room.code, masterId, questionId, 'I_DONT_KNOW');

      expect(mockIo.emit).toHaveBeenCalledWith('question_answered', {
        questionId,
        answer: 'I_DONT_KNOW',
      });
    });
  });

  describe('guessWord', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'QUESTION';
    });

    it('should accept exact match (case-insensitive) and transition to DISCUSSION', () => {
      const secretWord = room.gameState.secretWord!;
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.guessWord(room.code, nonMasterId, secretWord.toUpperCase());

      expect(result).toBe(true);
      expect(room.gameState.wordGuessedBy).toBe(nonMasterId);
      expect(room.gameState.phase).toBe('DISCUSSION');
    });

    it('should mark wrong guess as pending master approval', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.guessWord(room.code, nonMasterId, 'totally_wrong_word');

      expect(result).toBe(true);
      const question = room.gameState.questions[0];
      expect(question.pendingMasterApproval).toBe(true);
      expect(question.isGuess).toBe(true);
      expect(room.gameState.phase).toBe('QUESTION'); // Should not transition
    });

    it('should not allow master to guess', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.guessWord(room.code, masterId, 'anything');

      expect(result).toBe(false);
    });

    it('should emit word_guessed event for correct guess', () => {
      const secretWord = room.gameState.secretWord!;
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      gameManager.guessWord(room.code, nonMasterId, secretWord);

      expect(mockIo.emit).toHaveBeenCalledWith('word_guessed', expect.objectContaining({
        playerId: nonMasterId,
        correct: true,
      }));
    });

    it('should emit guess_pending_approval for incorrect guess', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      gameManager.guessWord(room.code, nonMasterId, 'wrong_guess');

      expect(mockIo.emit).toHaveBeenCalledWith('guess_pending_approval', expect.objectContaining({
        playerId: nonMasterId,
        word: 'wrong_guess',
      }));
    });
  });

  describe('approveGuess', () => {
    let room: Room;
    let questionId: string;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'QUESTION';

      // Make a wrong guess that needs approval
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';
      gameManager.guessWord(room.code, nonMasterId, 'synonym_of_secret');
      questionId = room.gameState.questions[0].id;
    });

    it('should allow master to approve a guess', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.approveGuess(room.code, masterId, questionId, true);

      expect(result).toBe(true);
      expect(room.gameState.questions[0].guessCorrect).toBe(true);
      expect(room.gameState.phase).toBe('DISCUSSION');
    });

    it('should allow master to reject a guess', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.approveGuess(room.code, masterId, questionId, false);

      expect(result).toBe(true);
      expect(room.gameState.questions[0].guessCorrect).toBe(false);
      expect(room.gameState.phase).toBe('QUESTION'); // Stay in question phase
    });

    it('should not allow non-master to approve', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.approveGuess(room.code, nonMasterId, questionId, true);

      expect(result).toBe(false);
    });
  });

  describe('submitVote', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 5; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'VOTING';
    });

    it('should allow non-master to vote', () => {
      const masterId = room.gameState.masterId!;
      const playerIds = Array.from(room.players.keys()).filter(id => id !== masterId);
      const nonMasterId = playerIds[0];
      const votedForId = playerIds[1]; // Vote for another non-master

      const result = gameManager.submitVote(room.code, nonMasterId, votedForId);

      expect(result).toBe(true);
      expect(room.gameState.votes[nonMasterId]).toBe(votedForId);
    });

    it('should not allow master to vote', () => {
      const masterId = room.gameState.masterId!;

      const result = gameManager.submitVote(room.code, masterId, 'player2');

      expect(result).toBe(false);
    });

    it('should not allow voting for master', () => {
      const masterId = room.gameState.masterId!;
      const nonMasterId = masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.submitVote(room.code, nonMasterId, masterId);

      expect(result).toBe(false);
    });

    it('should not allow voting for non-existent player', () => {
      const nonMasterId = room.gameState.masterId === 'host1' ? 'player2' : 'host1';

      const result = gameManager.submitVote(room.code, nonMasterId, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should tally votes when all eligible players have voted', () => {
      const masterId = room.gameState.masterId!;
      const eligibleVoters = Array.from(room.players.keys()).filter(id => id !== masterId);
      const insiderId = room.gameState.insiderId!;

      // Everyone votes for the insider
      for (const voterId of eligibleVoters) {
        gameManager.submitVote(room.code, voterId, insiderId);
      }

      expect(room.gameState.phase).toBe('RESULTS');
      expect(room.gameState.winner).toBe('COMMONS');
    });
  });

  describe('submitInitialVote', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 5; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
      room.gameState.phase = 'INITIAL_VOTE';
      room.gameState.wordGuessedBy = 'player2';
    });

    it('should record initial vote', () => {
      const result = gameManager.submitInitialVote(room.code, 'host1', true);

      expect(result).toBe(true);
      expect(room.gameState.initialVotes['host1']).toBe(true);
    });

    it('should tally votes when all players have voted', () => {
      for (const playerId of room.players.keys()) {
        gameManager.submitInitialVote(room.code, playerId, false);
      }

      // With majority NO, should proceed to VOTING phase
      expect(room.gameState.phase).toBe('VOTING');
    });

    it('should end game if majority YES and guesser is insider', () => {
      room.gameState.wordGuessedBy = room.gameState.insiderId;

      for (const playerId of room.players.keys()) {
        gameManager.submitInitialVote(room.code, playerId, true);
      }

      expect(room.gameState.phase).toBe('RESULTS');
      expect(room.gameState.winner).toBe('COMMONS');
    });

    it('should end game if majority YES but guesser is not insider', () => {
      // Ensure guesser is not insider
      const nonInsiderId = Array.from(room.players.keys()).find(
        id => id !== room.gameState.insiderId && id !== room.gameState.masterId
      )!;
      room.gameState.wordGuessedBy = nonInsiderId;

      for (const playerId of room.players.keys()) {
        gameManager.submitInitialVote(room.code, playerId, true);
      }

      expect(room.gameState.phase).toBe('RESULTS');
      expect(room.gameState.winner).toBe('INSIDER');
    });
  });

  describe('resetGame', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
    });

    it('should reset game state to WAITING', () => {
      const result = gameManager.resetGame(room.code);

      expect(result).toBe(true);
      expect(room.gameState.phase).toBe('WAITING');
      expect(room.gameState.secretWord).toBeNull();
      expect(room.gameState.masterId).toBeNull();
      expect(room.gameState.insiderId).toBeNull();
      expect(room.gameState.questions).toEqual([]);
      expect(room.gameState.votes).toEqual({});
      expect(room.gameState.winner).toBeNull();
    });

    it('should clear player roles', () => {
      gameManager.resetGame(room.code);

      for (const player of room.players.values()) {
        expect(player.role).toBeNull();
      }
    });

    it('should return false for non-existent room', () => {
      const result = gameManager.resetGame('XXXX');
      expect(result).toBe(false);
    });
  });

  describe('game flow - time runs out', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 4; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
    });

    it('should end game with INSIDER win when time runs out in QUESTION phase', () => {
      gameManager.startGame(room.code);

      // Fast forward through ROLE_REVEAL (5s)
      vi.advanceTimersByTime(5000);
      // Fast forward through WORD_REVEAL (5s)
      vi.advanceTimersByTime(5000);

      expect(room.gameState.phase).toBe('QUESTION');

      // Fast forward through QUESTION phase (300s)
      vi.advanceTimersByTime(300000);

      expect(room.gameState.phase).toBe('RESULTS');
      expect(room.gameState.winner).toBe('INSIDER');
    });
  });

  describe('winning conditions', () => {
    let room: Room;

    beforeEach(() => {
      room = createTestRoom(roomManager, 'host1', 'Host');
      for (let i = 2; i <= 5; i++) {
        joinTestRoom(roomManager, room.code, `player${i}`, `Player ${i}`);
      }
      gameManager.startGame(room.code);
    });

    it('should declare COMMONS winner when insider is correctly identified in voting', () => {
      room.gameState.phase = 'VOTING';
      const masterId = room.gameState.masterId!;
      const insiderId = room.gameState.insiderId!;
      const eligibleVoters = Array.from(room.players.keys()).filter(id => id !== masterId);

      // All vote for insider
      for (const voterId of eligibleVoters) {
        gameManager.submitVote(room.code, voterId, insiderId);
      }

      expect(room.gameState.winner).toBe('COMMONS');
    });

    it('should declare INSIDER winner when wrong person is voted', () => {
      room.gameState.phase = 'VOTING';
      const masterId = room.gameState.masterId!;
      const insiderId = room.gameState.insiderId!;
      const eligibleVoters = Array.from(room.players.keys()).filter(id => id !== masterId);

      // Find someone who is not the insider or master
      const wrongPerson = eligibleVoters.find(id => id !== insiderId)!;

      // All vote for wrong person
      for (const voterId of eligibleVoters) {
        gameManager.submitVote(room.code, voterId, wrongPerson);
      }

      expect(room.gameState.winner).toBe('INSIDER');
    });
  });
});
