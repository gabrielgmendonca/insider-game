import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager.js';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create a room with a 4-character code', () => {
      const { room } = roomManager.createRoom('host1', 'Host Player');
      expect(room.code).toHaveLength(4);
    });

    it('should set the host as the first player', () => {
      const { room } = roomManager.createRoom('host1', 'Host Player');
      expect(room.players.size).toBe(1);
      const host = room.players.get('host1');
      expect(host).toBeDefined();
      expect(host!.name).toBe('Host Player');
      expect(host!.isHost).toBe(true);
      expect(host!.connected).toBe(true);
      expect(host!.role).toBeNull();
    });

    it('should set the hostId correctly', () => {
      const { room } = roomManager.createRoom('host1', 'Host Player');
      expect(room.hostId).toBe('host1');
    });

    it('should initialize game state to WAITING', () => {
      const { room } = roomManager.createRoom('host1', 'Host Player');
      expect(room.gameState.phase).toBe('WAITING');
      expect(room.gameState.secretWord).toBeNull();
      expect(room.gameState.masterId).toBeNull();
      expect(room.gameState.insiderId).toBeNull();
      expect(room.gameState.questions).toEqual([]);
    });

    it('should create unique room codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const { room } = roomManager.createRoom(`host${i}`, `Player ${i}`);
        codes.add(room.code);
      }
      expect(codes.size).toBe(100);
    });

    it('should return a reconnect token', () => {
      const { reconnectToken } = roomManager.createRoom('host1', 'Host Player');
      expect(reconnectToken).toBeDefined();
      expect(reconnectToken.length).toBe(64); // 32 bytes hex encoded
    });
  });

  describe('joinRoom', () => {
    it('should add a player to an existing room', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      const result = roomManager.joinRoom(room.code, 'player2', 'Player 2');

      expect(result).not.toBeNull();
      expect(result!.room.players.size).toBe(2);
      const player = result!.room.players.get('player2');
      expect(player!.name).toBe('Player 2');
      expect(player!.isHost).toBe(false);
    });

    it('should return null for non-existent room', () => {
      const result = roomManager.joinRoom('XXXX', 'player1', 'Player');
      expect(result).toBeNull();
    });

    it('should not allow joining a full room (8 players)', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      for (let i = 2; i <= 8; i++) {
        roomManager.joinRoom(room.code, `player${i}`, `Player ${i}`);
      }

      const result = roomManager.joinRoom(room.code, 'player9', 'Player 9');
      expect(result).toBeNull();
    });

    it('should not allow joining a room not in WAITING phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'QUESTION';

      const result = roomManager.joinRoom(room.code, 'player2', 'Player 2');
      expect(result).toBeNull();
    });

    it('should return a reconnect token for the joining player', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      const result = roomManager.joinRoom(room.code, 'player2', 'Player 2');

      expect(result).not.toBeNull();
      expect(result!.reconnectToken).toBeDefined();
      expect(result!.reconnectToken.length).toBe(64);
    });
  });

  describe('leaveRoom', () => {
    it('should remove a player from the room', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      const result = roomManager.leaveRoom('player2');
      expect(result).not.toBeNull();
      expect(result!.room.players.size).toBe(1);
      expect(result!.wasHost).toBe(false);
    });

    it('should delete the room when last player leaves', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.leaveRoom('host1');

      expect(roomManager.getRoom(room.code)).toBeNull();
    });

    it('should reassign host when host leaves', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      const result = roomManager.leaveRoom('host1');
      expect(result!.wasHost).toBe(true);
      expect(result!.newHostId).toBe('player2');
      expect(result!.room.hostId).toBe('player2');
      expect(result!.room.players.get('player2')!.isHost).toBe(true);
    });

    it('should return null for non-existent player', () => {
      const result = roomManager.leaveRoom('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('disconnectPlayer', () => {
    it('should mark player as disconnected', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      const result = roomManager.disconnectPlayer('player2');
      expect(result).not.toBeNull();
      expect(result!.room.players.get('player2')!.connected).toBe(false);
      expect(result!.room.players.get('player2')!.disconnectedAt).toBeDefined();
    });

    it('should flag for deletion when all players disconnect', () => {
      roomManager.createRoom('host1', 'Host');

      const result = roomManager.disconnectPlayer('host1');
      expect(result!.shouldDelete).toBe(true);
    });

    it('should not flag for deletion when some players remain connected', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      const result = roomManager.disconnectPlayer('player2');
      expect(result!.shouldDelete).toBe(false);
    });
  });

  describe('reconnectPlayer', () => {
    it('should reconnect a disconnected player with valid token', () => {
      const { room, reconnectToken } = roomManager.createRoom('host1', 'Host');
      roomManager.disconnectPlayer('host1');

      const result = roomManager.reconnectPlayer(room.code, 'host1', reconnectToken);
      expect(result).not.toBeNull();
      expect(result!.players.get('host1')!.connected).toBe(true);
      expect(result!.players.get('host1')!.disconnectedAt).toBeUndefined();
    });

    it('should return null for non-existent room', () => {
      const result = roomManager.reconnectPlayer('XXXX', 'player1', 'sometoken');
      expect(result).toBeNull();
    });

    it('should return null for non-existent player', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      const result = roomManager.reconnectPlayer(room.code, 'nonexistent', 'sometoken');
      expect(result).toBeNull();
    });

    it('should return null for invalid reconnect token', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.disconnectPlayer('host1');

      const result = roomManager.reconnectPlayer(room.code, 'host1', 'invalid_token');
      expect(result).toBeNull();
    });

    it('should prevent player impersonation with wrong token', () => {
      const { room, reconnectToken: hostToken } = roomManager.createRoom('host1', 'Host');
      const joinResult = roomManager.joinRoom(room.code, 'player2', 'Player 2');
      roomManager.disconnectPlayer('player2');

      // Try to reconnect as player2 using host's token
      const result = roomManager.reconnectPlayer(room.code, 'player2', hostToken);
      expect(result).toBeNull();

      // Should succeed with correct token
      const correctResult = roomManager.reconnectPlayer(room.code, 'player2', joinResult!.reconnectToken);
      expect(correctResult).not.toBeNull();
    });
  });

  describe('getRoom and getRoomByPlayerId', () => {
    it('should retrieve room by code', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      const retrieved = roomManager.getRoom(room.code);
      expect(retrieved).toBe(room);
    });

    it('should retrieve room by player id', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      const retrieved = roomManager.getRoomByPlayerId('host1');
      expect(retrieved).toBe(room);
    });

    it('should return null for non-existent room code', () => {
      expect(roomManager.getRoom('XXXX')).toBeNull();
    });

    it('should return null for non-existent player id', () => {
      expect(roomManager.getRoomByPlayerId('nonexistent')).toBeNull();
    });
  });

  describe('getPlayer', () => {
    it('should retrieve player by id', () => {
      roomManager.createRoom('host1', 'Host');
      const player = roomManager.getPlayer('host1');
      expect(player).not.toBeNull();
      expect(player!.name).toBe('Host');
    });

    it('should return null for non-existent player', () => {
      expect(roomManager.getPlayer('nonexistent')).toBeNull();
    });
  });

  describe('deleteRoom', () => {
    it('should delete a room and clear player mappings', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      roomManager.deleteRoom(room.code);

      expect(roomManager.getRoom(room.code)).toBeNull();
      expect(roomManager.getRoomByPlayerId('host1')).toBeNull();
      expect(roomManager.getRoomByPlayerId('player2')).toBeNull();
    });
  });

  describe('toRoomInfo', () => {
    it('should convert room to RoomInfo format', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      const roomInfo = roomManager.toRoomInfo(room);

      expect(roomInfo.code).toBe(room.code);
      expect(roomInfo.players).toHaveLength(2);
      expect(roomInfo.hostId).toBe('host1');
    });

    it('should reveal own role to player after WAITING phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      room.gameState.phase = 'ROLE_REVEAL';
      room.players.get('host1')!.role = 'MASTER';
      room.players.get('player2')!.role = 'INSIDER';

      const roomInfo = roomManager.toRoomInfo(room, 'host1');
      const hostPlayer = roomInfo.players.find(p => p.id === 'host1');
      const otherPlayer = roomInfo.players.find(p => p.id === 'player2');

      expect(hostPlayer!.role).toBe('MASTER');
      expect(otherPlayer!.role).toBeNull(); // Other player's role hidden
    });

    it('should reveal all roles in RESULTS phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      room.gameState.phase = 'RESULTS';
      room.players.get('host1')!.role = 'MASTER';
      room.players.get('player2')!.role = 'INSIDER';

      const roomInfo = roomManager.toRoomInfo(room, 'host1');
      const hostPlayer = roomInfo.players.find(p => p.id === 'host1');
      const otherPlayer = roomInfo.players.find(p => p.id === 'player2');

      expect(hostPlayer!.role).toBe('MASTER');
      expect(otherPlayer!.role).toBe('INSIDER');
    });
  });

  describe('toPublicGameState', () => {
    it('should hide secret word from common players during QUESTION phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'QUESTION';
      room.gameState.secretWord = 'elephant';
      room.gameState.masterId = 'host1';
      room.gameState.insiderId = 'player2';

      const publicState = roomManager.toPublicGameState(room.gameState, 'player3', room);
      expect(publicState.secretWord).toBeNull();
    });

    it('should show secret word to master', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'QUESTION';
      room.gameState.secretWord = 'elephant';
      room.gameState.masterId = 'host1';

      const publicState = roomManager.toPublicGameState(room.gameState, 'host1', room);
      expect(publicState.secretWord).toBe('elephant');
    });

    it('should show secret word to insider', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      roomManager.joinRoom(room.code, 'player2', 'Player 2');

      room.gameState.phase = 'QUESTION';
      room.gameState.secretWord = 'elephant';
      room.gameState.masterId = 'host1';
      room.gameState.insiderId = 'player2';

      const publicState = roomManager.toPublicGameState(room.gameState, 'player2', room);
      expect(publicState.secretWord).toBe('elephant');
    });

    it('should show secret word to everyone in RESULTS phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'RESULTS';
      room.gameState.secretWord = 'elephant';
      room.gameState.masterId = 'host1';
      room.gameState.insiderId = 'player2';

      const publicState = roomManager.toPublicGameState(room.gameState, 'player3', room);
      expect(publicState.secretWord).toBe('elephant');
    });

    it('should hide insider identity until RESULTS phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'QUESTION';
      room.gameState.insiderId = 'player2';

      const publicState = roomManager.toPublicGameState(room.gameState, 'player3', room);
      expect(publicState.insiderId).toBeNull();
    });

    it('should reveal insider identity in RESULTS phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'RESULTS';
      room.gameState.insiderId = 'player2';

      const publicState = roomManager.toPublicGameState(room.gameState, 'player3', room);
      expect(publicState.insiderId).toBe('player2');
    });

    it('should hide votes until RESULTS phase', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'VOTING';
      room.gameState.votes = { 'player1': 'player2' };

      const publicState = roomManager.toPublicGameState(room.gameState, 'player3', room);
      expect(publicState.votes).toEqual({});
    });

    it('should show votes in RESULTS phase with vote counts', () => {
      const { room } = roomManager.createRoom('host1', 'Host');
      room.gameState.phase = 'RESULTS';
      room.gameState.votes = {
        'player1': 'player2',
        'player3': 'player2',
        'player4': 'player1'
      };

      const publicState = roomManager.toPublicGameState(room.gameState, 'player1', room);
      expect(publicState.votes).toEqual(room.gameState.votes);
      expect(publicState.voteCounts).toEqual({ 'player2': 2, 'player1': 1 });
    });
  });
});
