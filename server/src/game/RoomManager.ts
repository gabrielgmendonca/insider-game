import { Room, Player, GameState, GamePhase, RoomInfo, PlayerInfo, PublicGameState } from '../types/index.js';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createInitialGameState(): GameState {
  return {
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
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();

  createRoom(hostId: string, hostName: string): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const host: Player = {
      id: hostId,
      name: hostName,
      role: null,
      isHost: true,
      connected: true,
    };

    const room: Room = {
      code,
      players: new Map([[hostId, host]]),
      gameState: createInitialGameState(),
      hostId,
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(hostId, code);

    return room;
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (room.players.size >= 8) return null;

    if (room.gameState.phase !== 'WAITING') return null;

    const player: Player = {
      id: playerId,
      name: playerName,
      role: null,
      isHost: false,
      connected: true,
    };

    room.players.set(playerId, player);
    this.playerToRoom.set(playerId, roomCode);

    return room;
  }

  leaveRoom(playerId: string): { room: Room; wasHost: boolean; newHostId: string | null } | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    const wasHost = player.isHost;
    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);

    let newHostId: string | null = null;

    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
    } else if (wasHost) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
        newHostId = newHost.id;
      }
    }

    return { room, wasHost, newHostId };
  }

  disconnectPlayer(playerId: string): { room: Room; shouldDelete: boolean } | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.connected = false;
    player.disconnectedAt = Date.now();

    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    const shouldDelete = connectedPlayers.length === 0;

    return { room, shouldDelete };
  }

  reconnectPlayer(roomCode: string, playerId: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.connected = true;
    player.disconnectedAt = undefined;
    this.playerToRoom.set(playerId, roomCode);

    return room;
  }

  getRoom(roomCode: string): Room | null {
    return this.rooms.get(roomCode) || null;
  }

  getRoomByPlayerId(playerId: string): Room | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
  }

  getPlayer(playerId: string): Player | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;
    return room.players.get(playerId) || null;
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      for (const playerId of room.players.keys()) {
        this.playerToRoom.delete(playerId);
      }
      this.rooms.delete(roomCode);
    }
  }

  toRoomInfo(room: Room, forPlayerId?: string): RoomInfo {
    const players: PlayerInfo[] = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: this.shouldRevealRole(room.gameState, p.id, forPlayerId) ? p.role : null,
      isHost: p.isHost,
      connected: p.connected,
    }));

    return {
      code: room.code,
      players,
      gameState: this.toPublicGameState(room.gameState, forPlayerId, room),
      hostId: room.hostId,
    };
  }

  toPublicGameState(gameState: GameState, forPlayerId?: string, room?: Room): PublicGameState {
    const shouldShowWord =
      gameState.phase === 'RESULTS' ||
      (forPlayerId && (forPlayerId === gameState.masterId || forPlayerId === gameState.insiderId));

    const shouldShowVotes = gameState.phase === 'RESULTS';

    let voteCounts: Record<string, number> | undefined;
    if (shouldShowVotes) {
      voteCounts = {};
      for (const votedId of Object.values(gameState.votes)) {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      }
    }

    return {
      phase: gameState.phase,
      secretWord: shouldShowWord ? gameState.secretWord : null,
      masterId: gameState.masterId,
      insiderId: gameState.phase === 'RESULTS' ? gameState.insiderId : null,
      questions: gameState.questions,
      timerRemaining: gameState.timerRemaining,
      votes: shouldShowVotes ? gameState.votes : {},
      initialVotes: gameState.initialVotes,
      winner: gameState.winner,
      wordGuessedBy: gameState.wordGuessedBy,
      voteCounts,
    };
  }

  private shouldRevealRole(gameState: GameState, playerId: string, forPlayerId?: string): boolean {
    if (gameState.phase === 'RESULTS') return true;

    if (forPlayerId === playerId) {
      return gameState.phase !== 'WAITING';
    }

    return false;
  }
}

export const roomManager = new RoomManager();
