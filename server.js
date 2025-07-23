const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const fs = require('fs');

let WEAPON_DATA = {};

async function loadWeaponData() {
    try {
        const dataPath = path.join(__dirname, 'public', 'resources', 'data', 'weapon_data.json');
        const data = await fs.promises.readFile(dataPath, 'utf8');
        WEAPON_DATA = JSON.parse(data);
        console.log('Server: Weapon data loaded successfully.');
    } catch (error) {
        console.error('Server: Failed to load weapon data:', error);
    }
}

function getRandomWeaponName() {
    const weaponNames = Object.keys(WEAPON_DATA).filter(name => name !== 'Potion1_Filled.fbx');
    if (weaponNames.length === 0) {
        console.warn("Server: No weapons available to spawn (excluding Potion1_Filled.fbx).");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * weaponNames.length);
    return weaponNames[randomIndex];
}

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

// 정적 파일 서빙을 위한 디렉토리 설정 - 경로 업데이트됨
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
      players: [{ id: socket.id, ready: false, nickname: nickname, character: character }], // Store nickname and character
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
      rooms[roomId].players.push({ id: socket.id, ready: false, nickname: nickname, character: character }); // Store nickname and character
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
      // 고급 게임 시스템 데이터 처리
      if (data.type) {
        switch (data.type) {
          case 'playerState':
            // 플레이어 상태 업데이트 처리
            if (data.data && data.data.id) {
              // 플레이어 ID 확인 및 검증
              if (data.data.id === socket.id) {
                // 유효한 플레이어 상태 업데이트만 브로드캐스트
                socket.to(socket.roomId).emit('gameUpdate', data);
              }
            }
            break;
            
          case 'weaponAttack':
            // 무기 공격 이벤트 처리
            if (data.data && data.data.playerId === socket.id) {
              // 공격 데이터 검증 및 브로드캐스트
              socket.to(socket.roomId).emit('gameUpdate', data);
            }
            break;
            
          case 'projectile':
            // 투사체 이벤트 처리
            if (data.data && data.data.playerId === socket.id) {
              // 투사체 데이터 검증 및 브로드캐스트
              socket.to(socket.roomId).emit('gameUpdate', data);
            }
            break;
            
          case 'effect':
            // 이펙트 이벤트 처리
            socket.to(socket.roomId).emit('gameUpdate', data);
            break;
            
          case 'itemPickup':
            // 아이템 획득 이벤트 처리
            if (data.data && (data.data.playerId === socket.id || data.data.type === 'spawn')) {
              // 아이템 획득 데이터 검증 및 브로드캐스트
              socket.to(socket.roomId).emit('gameUpdate', data);
              
              // 아이템 상태 저장 (필요시)
              if (!rooms[socket.roomId].gameState.items) {
                rooms[socket.roomId].gameState.items = [];
              }
              
              if (data.data.type === 'spawn') {
                // 아이템 생성 이벤트 처리
                rooms[socket.roomId].gameState.items.push({
                  id: data.data.itemId,
                  name: data.data.itemName,
                  position: data.data.position,
                  available: true
                });
              } else if (data.data.type === 'pickup') {
                // 아이템 획득 이벤트 처리
                const item = rooms[socket.roomId].gameState.items.find(i => i.id === data.data.itemId);
                if (item) {
                  item.available = false;
                  item.ownerId = data.data.playerId;
                }
              }
            }
            break;
            
          case 'damage':
            // 데미지 이벤트 처리
            if (data.data && data.data.attackerId === socket.id) {
              // 데미지 데이터 검증 및 브로드캐스트
              socket.to(socket.roomId).emit('gameUpdate', data);
            }
            break;
            
          default:
            // 기타 게임 업데이트 브로드캐스트
            socket.to(socket.roomId).emit('gameUpdate', data);
        }
      } else {
        // 기존 방식의 게임 업데이트 처리 (하위 호환성 유지)
        socket.to(socket.roomId).emit('gameUpdate', data);
      }
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
          io.to(socket.roomId).emit('startGame', { players: room.players, map: room.map });
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

loadWeaponData();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});