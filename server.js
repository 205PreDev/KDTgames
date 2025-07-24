const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { getRandomWeaponName } = require('./weaponUtils');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const rooms = {}; // { roomId: { players: [{ id: socket.id, ready: false }], gameState: {} } }

// Helper function to update all players in a room
function updateRoomPlayers(roomId) {
  if (rooms[roomId]) {
    // Send nickname and character along with player ID and ready status
    const playersData = rooms[roomId].players.map(p => ({
      id: p.id,
      nickname: p.nickname, // Add nickname
      ready: p.ready,
      character: p.character // Add character
    }));
    io.to(roomId).emit('updatePlayers', playersData, rooms[roomId].maxPlayers);
  }
}

// 정적 파일 서빙을 위한 디렉토리 설정
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('getPublicRooms', () => {
    const publicRooms = Object.values(rooms).filter(room => room.visibility === 'public').map(room => ({
      id: room.id,
      players: room.players.length,
      maxPlayers: room.maxPlayers,
      map: room.map,
      name: room.name, // Add room name
      status: room.status // Add room status
    }));
    socket.emit('publicRoomsList', publicRooms);
  });

  socket.on('createRoom', (roomSettings) => {
    const roomId = Math.random().toString(36).substring(2, 8); // Simple unique ID
    const { map, maxPlayers, visibility, roundTime, nickname, character, roomName } = roomSettings; // Destructure nickname, character, and roomName

    rooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, ready: false, nickname: nickname, character: character, equippedWeapon: null, isAttacking: false, hp: 100 }], // Store nickname, character, equippedWeapon, attacking state, and HP
      gameState: {},
      map: map,
      maxPlayers: maxPlayers,
      visibility: visibility,
      roundTime: roundTime,
      name: roomName, // Store room name
      status: 'waiting' // Add room status
    };
    socket.join(roomId);
    socket.roomId = roomId; // Store roomId on socket for easy access
    console.log(`Room created: ${roomId} by ${socket.id} with settings:`, roomSettings);
    socket.emit('roomCreated', { id: roomId, name: rooms[roomId].name, map: rooms[roomId].map });
    updateRoomPlayers(roomId);
  });

  socket.on('joinRoom', (roomId, nickname, character) => { // Receive nickname and character
    if (rooms[roomId]) {
      // Check if player is already in the room
      if (rooms[roomId].players.some(p => p.id === socket.id)) {
        socket.emit('roomError', 'Already in this room');
        return;
      }
      // Check if room is full
      if (rooms[roomId].players.length >= rooms[roomId].maxPlayers) {
        socket.emit('roomError', 'Room is full');
        return;
      }
      // Check if room is playing
      if (rooms[roomId].status === 'playing') {
        socket.emit('roomError', 'Game is already in progress');
        return;
      }
      // If private room, check if the provided roomId matches the actual roomId
      if (rooms[roomId].visibility === 'private' && roomId !== rooms[roomId].id) {
        socket.emit('roomError', 'Invalid private room code');
        return;
      }
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, ready: false, nickname: nickname, character: character, equippedWeapon: null, isAttacking: false, hp: 100 }); // Store nickname, character, equippedWeapon, attacking state, and HP
      socket.roomId = roomId;
      console.log(`${socket.id} joined room: ${roomId}`);
      socket.emit('roomJoined', { id: roomId, name: rooms[roomId].name, map: rooms[roomId].map });
      updateRoomPlayers(roomId);
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });

  socket.on('ready', () => { // No longer receives character
    if (socket.roomId && rooms[socket.roomId]) {
      const playerIndex = rooms[socket.roomId].players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        rooms[socket.roomId].players[playerIndex].ready = !rooms[socket.roomId].players[playerIndex].ready;
        // rooms[socket.roomId].players[playerIndex].character = character; // Remove this line
        updateRoomPlayers(socket.roomId);

        // Check if all players are ready
        const allReady = rooms[socket.roomId].players.every(p => p.ready);
        if (allReady && rooms[socket.roomId].players.length > 0) {
          // If all players are ready, notify the room creator
          const roomCreator = rooms[socket.roomId].players[0]; // Assuming the first player is the creator
          if (roomCreator.id === socket.id) { // Only if the current player is the creator
            socket.emit('allPlayersReady');
          }
        }
      }
    }
  });

  socket.on('gameUpdate', (data) => {
    if (socket.roomId && rooms[socket.roomId]) {
      // Update player's equipped weapon in gameState
      const playerInRoom = rooms[socket.roomId].players.find(p => p.id === socket.id);
      if (playerInRoom) {
        playerInRoom.equippedWeapon = data.equippedWeapon; // Store equipped weapon
        playerInRoom.isAttacking = data.isAttacking; // Store attacking state
        playerInRoom.hp = data.hp; // Store HP
      }
      // Broadcast game updates to all other clients in the same room
      socket.to(socket.roomId).emit('gameUpdate', data);
    }
  });

  socket.on('startGameRequest', () => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      const roomCreator = room.players[0]; // Assuming the first player is the creator

      // Check if the request comes from the room creator
      if (roomCreator.id === socket.id) {
        const allReady = room.players.every(p => p.ready);
        if (allReady && room.players.length > 0) {
          room.status = 'playing'; // Change room status to playing

          // Generate random weapon positions and names
          const spawnedWeapons = [];
          for (let i = 0; i < 10; i++) {
            const weaponName = getRandomWeaponName();
            if (weaponName) {
              const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Simple unique ID
              // Generate random positions within a reasonable range for the map
              const x = Math.random() * 80 - 40; // 맵 범위 (-40 ~ 40)
              const y = 1; // 무기 스폰 높이 (1만큼 높임)
              const z = Math.random() * 80 - 40; // 맵 범위 (-40 ~ 40)
              spawnedWeapons.push({ uuid, weaponName, x, y, z });
            }
          }
          room.gameState.spawnedWeapons = spawnedWeapons; // Store in gameState

          io.to(socket.roomId).emit('startGame', { players: room.players, map: room.map, spawnedWeapons: spawnedWeapons });
        } else {
          socket.emit('roomError', '모든 플레이어가 준비되지 않았습니다.');
        }
      } else {
        socket.emit('roomError', '방장만 게임을 시작할 수 있습니다.');
      }
    }
  });

  socket.on('increaseMaxPlayers', () => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      const roomCreator = room.players[0];

      if (roomCreator.id === socket.id) {
        if (room.maxPlayers < 8) {
          room.maxPlayers++;
          updateRoomPlayers(socket.roomId);
        } else {
          socket.emit('roomError', '최대 인원은 8명까지 설정할 수 있습니다.');
        }
      } else {
        socket.emit('roomError', '방장만 인원수를 변경할 수 있습니다.');
      }
    }
  });

  socket.on('closePlayerSlot', (slotIndex) => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      const roomCreator = room.players[0];

      if (roomCreator.id === socket.id) {
        if (slotIndex < room.maxPlayers) { // Only allow closing open slots
          const playerToKick = room.players[slotIndex];
          if (playerToKick) {
            // Kick the player
            io.to(playerToKick.id).emit('roomError', '방장에 의해 강제 퇴장되었습니다.');
            io.sockets.sockets.get(playerToKick.id)?.leave(socket.roomId);
            room.players.splice(slotIndex, 1);
          }
          // Decrease maxPlayers, but not below current player count
          room.maxPlayers = Math.max(room.players.length, room.maxPlayers - 1);
          updateRoomPlayers(socket.roomId);
        } else {
          socket.emit('roomError', '유효하지 않은 슬롯입니다.');
        }
      } else {
        socket.emit('roomError', '방장만 슬롯을 닫을 수 있습니다.');
      }
    }
  });

  socket.on('weaponPickedUp', (weaponUuid) => {
    if (socket.roomId && rooms[socket.roomId]) {
      let spawnedWeapons = rooms[socket.roomId].gameState.spawnedWeapons;
      if (spawnedWeapons) {
        // Remove the picked up weapon from the server's game state
        rooms[socket.roomId].gameState.spawnedWeapons = spawnedWeapons.filter(weapon => weapon.uuid !== weaponUuid);
        // Broadcast to all clients in the room that this weapon was picked up
        io.to(socket.roomId).emit('weaponPickedUp', weaponUuid);
      }
    }
  });

  socket.on('weaponSpawned', (weaponData) => {
    if (socket.roomId && rooms[socket.roomId]) {
      let spawnedWeapons = rooms[socket.roomId].gameState.spawnedWeapons;
      if (spawnedWeapons) {
        spawnedWeapons.push(weaponData);
        io.to(socket.roomId).emit('weaponSpawned', weaponData);
      }
    }
  });

  socket.on('weaponEquipped', (weaponName) => {
    if (socket.roomId && rooms[socket.roomId]) {
      const playerInRoom = rooms[socket.roomId].players.find(p => p.id === socket.id);
      if (playerInRoom) {
        playerInRoom.equippedWeapon = weaponName; // Store equipped weapon
        // Broadcast to all other clients in the room that this player equipped a weapon
        socket.to(socket.roomId).emit('playerEquippedWeapon', { playerId: socket.id, weaponName: weaponName });
      }
    }
  });

  socket.on('playerAttack', (animationName) => {
    if (socket.roomId && rooms[socket.roomId]) {
      // Broadcast to all other clients in the room that this player attacked
      socket.to(socket.roomId).emit('playerAttack', { playerId: socket.id, animationName: animationName });
    }
  });

  socket.on('playerDamage', (data) => {
    console.log(`[Server] Received playerDamage: targetId=${data.targetId}, damage=${data.damage}`);
    if (socket.roomId && rooms[socket.roomId]) {
      const room = rooms[socket.roomId];
      const targetPlayer = room.players.find(p => p.id === data.targetId);
      if (targetPlayer) {
        console.log(`[Server] Target player found: ${targetPlayer.nickname} (HP: ${targetPlayer.hp})`);
        targetPlayer.hp -= data.damage;
        if (targetPlayer.hp < 0) targetPlayer.hp = 0;
        console.log(`[Server] ${targetPlayer.nickname} new HP: ${targetPlayer.hp}`);

        // 모든 클라이언트에게 HP 업데이트 브로드캐스트
        io.to(socket.roomId).emit('hpUpdate', { playerId: targetPlayer.id, hp: targetPlayer.hp });
        console.log(`[Server] Emitted hpUpdate: playerId=${targetPlayer.id}, hp=${targetPlayer.hp}`);

        if (targetPlayer.hp === 0) {
          // 사망 처리 (필요하다면 추가 로직)
          console.log(`${targetPlayer.nickname} (${targetPlayer.id}) has been defeated!`);
          // 리스폰 로직은 클라이언트에서 처리
        }
      } else {
        console.log(`[Server] Target player ${data.targetId} not found in room ${socket.roomId}`);
      }
    }
  });
  socket.on('animationChange', (data) => {
      if (socket.roomId && rooms[socket.roomId]) {
        socket.to(socket.roomId).emit('remoteAnimationChange', {
          playerId: socket.id,
          anim: data.anim
        });
      }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].players = rooms[socket.roomId].players.filter(
        (p) => p.id !== socket.id
      );
      if (rooms[socket.roomId].players.length === 0) {
        delete rooms[socket.roomId]; // Delete room if no players left
        console.log(`Room ${socket.roomId} deleted.`);
      } else {
        updateRoomPlayers(socket.roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
