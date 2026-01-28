import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types/index.js';
import { roomManager } from '../game/RoomManager.js';
import { GameManager } from '../game/GameManager.js';
import { timerManager } from '../game/TimerManager.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const RECONNECT_GRACE_PERIOD = 60000;

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const gameManager = new GameManager(io);

  io.on('connection', (socket: GameSocket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create_room', ({ playerName }) => {
      const existingRoom = roomManager.getRoomByPlayerId(socket.id);
      if (existingRoom) {
        socket.emit('error', { message: 'Already in a room' });
        return;
      }

      const { room, reconnectToken } = roomManager.createRoom(socket.id, playerName);
      socket.join(room.code);

      socket.emit('room_created', { roomCode: room.code });
      socket.emit('room_joined', {
        room: roomManager.toRoomInfo(room, socket.id),
        playerId: socket.id,
        reconnectToken,
      });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
      const existingRoom = roomManager.getRoomByPlayerId(socket.id);
      if (existingRoom) {
        socket.emit('error', { message: 'Already in a room' });
        return;
      }

      const result = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, playerName);
      if (!result) {
        socket.emit('error', { message: 'Room not found, full, or game in progress' });
        return;
      }

      const { room, reconnectToken } = result;
      socket.join(room.code);

      const player = room.players.get(socket.id)!;
      socket.to(room.code).emit('player_joined', {
        player: {
          id: player.id,
          name: player.name,
          role: null,
          isHost: player.isHost,
          connected: player.connected,
        },
      });

      socket.emit('room_joined', {
        room: roomManager.toRoomInfo(room, socket.id),
        playerId: socket.id,
        reconnectToken,
      });
    });

    socket.on('reconnect_to_room', ({ roomCode, playerId, reconnectToken }) => {
      if (!reconnectToken) {
        socket.emit('error', { message: 'Invalid reconnection credentials' });
        return;
      }

      const room = roomManager.reconnectPlayer(roomCode.toUpperCase(), playerId, reconnectToken);
      if (!room) {
        socket.emit('error', { message: 'Cannot reconnect to room - invalid credentials or room not found' });
        return;
      }

      socket.join(room.code);
      socket.to(room.code).emit('player_reconnected', { playerId });

      // Get the player's token to send back (it's the same token, but confirms validity)
      const player = room.players.get(playerId);
      socket.emit('room_joined', {
        room: roomManager.toRoomInfo(room, playerId),
        playerId,
        reconnectToken: player!.reconnectToken,
      });
    });

    socket.on('leave_room', () => {
      handlePlayerLeave(socket);
    });

    socket.on('start_game', () => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (!gameManager.startGame(room.code)) {
        socket.emit('error', { message: 'Cannot start game - need 4-8 players' });
      }
    });

    socket.on('ask_question', ({ text }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.askQuestion(room.code, socket.id, text)) {
        socket.emit('error', { message: 'Cannot ask question' });
      }
    });

    socket.on('answer_question', ({ questionId, answer }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.answerQuestion(room.code, socket.id, questionId, answer)) {
        socket.emit('error', { message: 'Cannot answer question' });
      }
    });

    socket.on('guess_word', ({ word }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.guessWord(room.code, socket.id, word)) {
        socket.emit('error', { message: 'Cannot guess word' });
      }
    });

    socket.on('submit_vote', ({ votedPlayerId }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.submitVote(room.code, socket.id, votedPlayerId)) {
        socket.emit('error', { message: 'Cannot submit vote' });
      }
    });

    socket.on('submit_initial_vote', ({ votesYes }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.submitInitialVote(room.code, socket.id, votesYes)) {
        socket.emit('error', { message: 'Cannot submit initial vote' });
      }
    });

    socket.on('approve_guess', ({ questionId, approved }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      if (!gameManager.approveGuess(room.code, socket.id, questionId, approved)) {
        socket.emit('error', { message: 'Cannot approve guess - only the Master can do this' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const result = roomManager.disconnectPlayer(socket.id);

      if (result) {
        const { room, shouldDelete } = result;

        if (shouldDelete) {
          timerManager.stopTimer(room.code);
          roomManager.deleteRoom(room.code);
        } else {
          socket.to(room.code).emit('player_left', { playerId: socket.id });

          setTimeout(() => {
            const player = room.players.get(socket.id);
            if (player && !player.connected) {
              const leaveResult = roomManager.leaveRoom(socket.id);
              if (leaveResult) {
                io.to(room.code).emit('player_left', { playerId: socket.id });
                if (leaveResult.newHostId) {
                  io.to(room.code).emit('host_changed', { newHostId: leaveResult.newHostId });
                }
              }
            }
          }, RECONNECT_GRACE_PERIOD);
        }
      }
    });
  });

  function handlePlayerLeave(socket: GameSocket): void {
    const result = roomManager.leaveRoom(socket.id);
    if (result) {
      const { room, newHostId } = result;
      socket.leave(room.code);
      socket.to(room.code).emit('player_left', { playerId: socket.id });

      if (newHostId) {
        io.to(room.code).emit('host_changed', { newHostId });
      }
    }
  }
}
