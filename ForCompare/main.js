import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { player } from './player.js';
import { object } from './object.js';
import { math } from './math.js';
import { hp } from './hp.js'; // hp.js 임포트

const socket = io();

export class GameStage3 {
  constructor(socket, players, map) {
    this.socket = socket;
    this.players = {}; // To store other players' objects
    this.localPlayerId = socket.id;
    this.playerInfo = players;
    this.map = map;

    this.Initialize();
    this.RAF();
    this.SetupSocketEvents();
  }

  Initialize() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;
    document.getElementById('container').appendChild(this.renderer.domElement);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1.0;
    const far = 2000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(-8, 6, 12);
    this.camera.lookAt(0, 2, 0);

    this.scene = new THREE.Scene();

    this.SetupLighting();
    this.SetupSkyAndFog();
    this.CreateGround();
    this.CreateLocalPlayer();

    // 맵 경계 정의 (80x80 맵의 절반)
    this.mapBounds = { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
    this.damageTimer = 0;
    this.damageInterval = 0.5; // 0.5초마다 데미지
    this.damageAmount = 25; // 데미지량
    this.isRespawning = false;

    window.addEventListener('resize', () => this.OnWindowResize(), false);
  }

  SetupLighting() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(60, 100, 10);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1.0;
    directionalLight.shadow.camera.far = 200.0;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0xf6f47f, 0.6);
    this.scene.add(hemisphereLight);
  }

  SetupSkyAndFog() {
    const skyUniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0x89b2eb) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeometry = new THREE.SphereGeometry(1000, 32, 15);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize( vWorldPosition + offset ).y;
          gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0), exponent ), 0.0 ) ), 1.0 );
        }`,
      side: THREE.BackSide,
    });

    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skyMesh);
    this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
  }

  CreateGround() {
    const textureLoader = new THREE.TextureLoader();
    const capitalizedMapName = this.map.charAt(0).toUpperCase() + this.map.slice(1);
    const grassTexture = textureLoader.load(`./resources/${capitalizedMapName}.png`);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(1, 1);

    const groundGeometry = new THREE.PlaneGeometry(80, 80, 10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  getRandomPosition() {
    const maxAttempts = 100; // 최대 시도 횟수
    const playerHalfWidth = 0.65; // player.js의 halfWidth
    const playerHalfDepth = 0.65; // player.js의 halfDepth
    const playerHeight = 3.2; // player.js의 halfHeight * 2

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.random() * 80 - 40;
      const z = Math.random() * 80 - 40;
      let y = 0.5; // Default y position

      const collidables = this.npc_.GetCollidables();
      const checkPosition = new THREE.Vector3(x, 100, z); // Check from a high position
      const raycaster = new THREE.Raycaster(checkPosition, new THREE.Vector3(0, -1, 0));

      let highestY = -Infinity;
      let objectFound = false;

      for (const collidable of collidables) {
        const intersects = raycaster.intersectObject(collidable.model, true); // true for recursive
        if (intersects.length > 0) {
          const intersection = intersects[0];
          if (intersection.point.y > highestY) {
            highestY = intersection.point.y;
            objectFound = true;
          }
        }
      }

      if (objectFound) {
        y = highestY + 0.1; // Place slightly above the object
      }

      // 플레이어의 임시 바운딩 박스 생성
      const tempPlayerBox = new THREE.Box3(
        new THREE.Vector3(x - playerHalfWidth, y, z - playerHalfDepth),
        new THREE.Vector3(x + playerHalfWidth, y + playerHeight, z + playerHalfDepth)
      );

      let isColliding = false;
      for (const collidable of collidables) {
        if (tempPlayerBox.intersectsBox(collidable.boundingBox)) {
          isColliding = true;
          break;
        }
      }

      if (!isColliding) {
        return new THREE.Vector3(x, y, z);
      }
    }

    // 최대 시도 횟수를 초과하면 기본 위치 반환 (최후의 수단)
    console.warn("Failed to find a non-colliding spawn position after multiple attempts.");
    return new THREE.Vector3(0, 0.5, 0);
  }

  CreateLocalPlayer() {
    const npcPos = new THREE.Vector3(0, 0, -4);
    this.npc_ = new object.NPC(this.scene, npcPos);

    const localPlayerData = this.playerInfo.find(p => p.id === this.localPlayerId);

    this.player_ = new player.Player({
      scene: this.scene,
      onDebugToggle: (visible) => this.npc_.ToggleDebugVisuals(visible),
      character: localPlayerData.character,
      hpUI: new hp.HPUI(this.scene, this.renderer, localPlayerData.nickname), // HPUI 인스턴스 생성 및 전달
      getRespawnPosition: () => this.getRandomPosition(),
      onLoad: () => {
        const initialPosition = this.getRandomPosition();
        this.player_.SetPosition([initialPosition.x, initialPosition.y, initialPosition.z]);
      }
    });

    this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
    this.rotationAngle = 4.715;
  }

  OnWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  UpdateCamera() {
    if (!this.player_ || !this.player_.mesh_) return;

    const target = this.player_.mesh_.position.clone();
    const offset = this.cameraTargetOffset.clone();
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationAngle);
    const cameraPos = target.clone().add(offset);
    this.camera.position.copy(cameraPos);

    const headOffset = new THREE.Vector3(0, 2, 0);
    const headPosition = target.clone().add(headOffset);
    this.camera.lookAt(headPosition);
  }

  SetupSocketEvents() {
    this.socket.on('gameUpdate', (data) => {
      // Update other players' positions
      if (data.playerId === this.localPlayerId) return; // Don't update self

      let otherPlayer = this.players[data.playerId];
      if (!otherPlayer) {
        const remotePlayerData = this.playerInfo.find(p => p.id === data.playerId);
        // Create a new player object for the new player
        otherPlayer = new player.Player({
          scene: this.scene,
          character: remotePlayerData.character,
          isRemote: true,
          hpUI: new hp.HPUI(this.scene, this.renderer, remotePlayerData.nickname) // 원격 플레이어 HPUI 생성
        });
        this.players[data.playerId] = otherPlayer;
      }
      otherPlayer.SetPosition(data.position);
      otherPlayer.SetRotation(data.rotation);
      if (data.animation) {
        otherPlayer.SetRemoteAnimation(data.animation);
      }
      // 원격 플레이어 HP 업데이트
      if (data.hp !== undefined) {
        if (data.hp < otherPlayer.hp_) {
          // HP가 감소했을 때만 TakeDamage 호출하여 애니메이션 트리거
          otherPlayer.TakeDamage(otherPlayer.hp_ - data.hp);
        } else if (data.hp === 100 && otherPlayer.isDead_) { // HP가 100으로 회복되고 죽은 상태였으면 리스폰 처리
          otherPlayer.hp_ = data.hp;
          otherPlayer.isDead_ = false;
          otherPlayer.SetRemoteAnimation('Idle');
          if (otherPlayer.hpUI) {
            otherPlayer.hpUI.updateHP(data.hp);
          }
        } else {
          otherPlayer.hp_ = data.hp;
          if (otherPlayer.hpUI) {
            otherPlayer.hpUI.updateHP(data.hp);
          }
        }
      }
    });

    this.socket.on('playerJoined', (playerId) => {
      console.log(`Player ${playerId} joined the room.`);
      // Optionally, request initial state from the new player
    });

    this.socket.on('playerLeft', (playerId) => {
      console.log(`Player ${playerId} left the room.`);
      const otherPlayer = this.players[playerId];
      if (otherPlayer) {
        this.scene.remove(otherPlayer.mesh_);
        delete this.players[playerId];
      }
    });
  }

  RAF(time) {
    requestAnimationFrame((t) => this.RAF(t));

    if (!this.prevTime) this.prevTime = time || performance.now();
    const delta = ((time || performance.now()) - this.prevTime) * 0.001;
    this.prevTime = time || performance.now();

    if (this.player_ && this.player_.mesh_) {
      this.player_.Update(delta, this.rotationAngle, this.npc_.GetCollidables());
      this.UpdateCamera();

      // Send player position to server
      this.socket.emit('gameUpdate', {
        playerId: this.localPlayerId,
        position: this.player_.mesh_.position.toArray(),
        rotation: this.player_.mesh_.rotation.toArray(),
        animation: this.player_.currentAnimationName_, // Add animation state
        hp: this.player_.hp_ // Add HP state
      });

      // 맵 경계 체크 및 데미지 적용
      const playerPos = this.player_.mesh_.position;
      if (
        playerPos.x < this.mapBounds.minX ||
        playerPos.x > this.mapBounds.maxX ||
        playerPos.z < this.mapBounds.minZ ||
        playerPos.z > this.mapBounds.maxZ
      ) {
        this.damageTimer += delta;
        if (this.damageTimer >= this.damageInterval) {
          this.player_.TakeDamage(this.damageAmount);
          this.damageTimer = 0;
        }
      } else {
        this.damageTimer = 0; // 맵 안으로 들어오면 타이머 초기화
      }

      // HP UI 업데이트
      if (this.player_.hpUI) {
        this.player_.hpUI.updateHP(this.player_.hp_);
      }
    }

    for (const id in this.players) {
      this.players[id].Update(delta);
    }

    if (this.npc_) {
      this.npc_.Update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

const menu = document.getElementById('menu');
const controls = document.getElementById('controls');
const createRoomButton = document.getElementById('createRoomButton');
const joinRoomMainButton = document.getElementById('joinRoomMainButton');
const joinRoomPopup = document.getElementById('joinRoomPopup');
const publicRoomList = document.getElementById('publicRoomList');
const privateRoomCodeInput = document.getElementById('privateRoomCodeInput');
const popupJoinButton = document.getElementById('popupJoinButton');
const popupCloseButton = document.getElementById('popupCloseButton');
const waitingRoom = document.getElementById('waitingRoom');
const waitingRoomIdDisplay = document.getElementById('waitingRoomIdDisplay');
const playerList = document.getElementById('playerList');
const readyButton = document.getElementById('readyButton');
const startGameButton = document.getElementById('startGameButton');

// const maxPlayersInput = document.getElementById('maxPlayersInput'); // This input is now part of the create room popup

// New elements for create room popup
const createRoomSettingsPopup = document.getElementById('createRoomSettingsPopup');
const characterNicknamePopup = document.getElementById('characterNicknamePopup');

let roomSettings = {}; // Global variable to store room creation settings
let joinRoomId = null; // Global variable to store room ID for joining
let isRoomCreator = false; // Track if the current client is the room creator

const mapSelectionContainer = document.getElementById('mapSelectionContainer');
const mapThumbnails = document.querySelectorAll('.map-thumbnail');
const maxPlayersCreate = document.getElementById('maxPlayersCreate');
const roomVisibility = document.getElementById('roomVisibility');

const createRoomConfirmButton = document.getElementById('createRoomConfirmButton');
const createRoomCancelButton = document.getElementById('createRoomCancelButton');


const playerSlotsContainer = document.getElementById('playerSlotsContainer');

const waitingRoomTitle = document.getElementById('waitingRoomTitle');
const currentMapImage = document.getElementById('currentMapImage');
const mapPlaceholderText = document.getElementById('mapPlaceholderText');

function updatePlayers(players, maxPlayers) {
  playerSlotsContainer.innerHTML = '';
  const totalSlots = 8; // Always show 8 slots

  for (let i = 0; i < totalSlots; i++) {
    const playerSlot = document.createElement('div');
    playerSlot.classList.add('player-slot');

    const playerInfo = players[i];
    if (i < maxPlayers) { // Open slots
      if (playerInfo) {
        playerSlot.style.border = '2px solid #4CAF50';
        playerSlot.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
        playerSlot.innerHTML = `
          <img src="./resources/character/${playerInfo.character}.png" alt="${playerInfo.nickname}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 5px;">
          <p style="margin: 0;">${playerInfo.nickname}</p>
          <p style="margin: 0; font-size: 12px; color: #eee;">${playerInfo.ready ? '(준비)' : '(대기)'}</p>
        `;
        if (isRoomCreator) {
          const closeBtn = document.createElement('div');
          closeBtn.classList.add('close-slot-btn');
          closeBtn.textContent = 'X';
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from propagating to the slot itself
            socket.emit('closePlayerSlot', i); // Send slot index
          });
          playerSlot.appendChild(closeBtn);
        }
      } else {
        playerSlot.style.border = '2px dashed #aaa';
        playerSlot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        playerSlot.innerHTML = `<p>슬롯 ${i + 1}</p><p>(비어있음)</p>`;
        if (isRoomCreator) {
          const closeBtn = document.createElement('div');
          closeBtn.classList.add('close-slot-btn');
          closeBtn.textContent = 'X';
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            socket.emit('closePlayerSlot', i);
          });
          playerSlot.appendChild(closeBtn);
        }
      }
    } else { // Closed slots
      playerSlot.classList.add('closed');
      playerSlot.innerHTML = `<p>슬롯 ${i + 1}</p>`;
      if (isRoomCreator) {
        playerSlot.addEventListener('click', () => {
          socket.emit('increaseMaxPlayers');
        });
      }
    }
    playerSlotsContainer.appendChild(playerSlot);
  }
}

createRoomButton.addEventListener('click', () => {
  createRoomSettingsPopup.style.display = 'flex'; // Show create room settings popup
});

const roomNameCreate = document.getElementById('roomNameCreate');

  createRoomConfirmButton.addEventListener('click', () => {
    const selectedMapElement = document.querySelector('.map-thumbnail.selected');
    const selectedMap = selectedMapElement ? selectedMapElement.dataset.map : 'map1'; // Default to map1 if none selected
    const maxPlayers = parseInt(maxPlayersCreate.value, 10);
    const visibility = roomVisibility.value;
    const selectedRoundTimeButton = document.querySelector('#roundTimeOptions .round-time-btn.selected');
    const roundDuration = selectedRoundTimeButton ? parseInt(selectedRoundTimeButton.dataset.value, 10) : 180; // 기본값 180초
    const roomName = roomNameCreate.value.trim();

  if (!roomName) {
    alert('방 이름을 입력해주세요.');
    return;
  }

  if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
    alert('최대 인원은 2에서 8 사이의 숫자로 설정해주세요.');
    return;
  }
  if (isNaN(roundDuration) || roundDuration < 60 || roundDuration > 600) {
    alert('라운드 시간은 60초에서 600초 사이로 설정해주세요.');
    return;
  }

  roomSettings = { map: selectedMap, maxPlayers: maxPlayers, visibility: visibility, roundTime: roundDuration, roomName: roomName };

  createRoomSettingsPopup.style.display = 'none'; // Hide create room settings popup
  characterNicknamePopup.style.display = 'flex'; // Show character and nickname popup
  initializeCharacterSelection(); // Initialize the character selection UI
});

createRoomCancelButton.addEventListener('click', () => {
  createRoomSettingsPopup.style.display = 'none'; // Hide popup
});

// Custom event listener for character selection
document.addEventListener('characterSelected', (event) => {
  const { character, nickname } = event.detail;

  if (!nickname) {
    alert('닉네임을 입력해주세요.');
    return;
  }

  menu.style.display = 'none'; // Hide main menu
  waitingRoom.style.display = 'flex'; // Show waiting room

  // 방 생성 또는 참가 로직 분기
  if (roomSettings.map) { // 방 생성 흐름
    socket.emit('createRoom', { ...roomSettings, nickname: nickname, character: character });
    roomSettings = {}; // Reset room settings after use
  } else if (joinRoomId) { // 방 참가 흐름
    socket.emit('joinRoom', joinRoomId, nickname, character);
    waitingRoomIdDisplay.textContent = `방 ID: ${joinRoomId}`;
    joinRoomId = null; // Reset joinRoomId
  } else {
    alert('방 생성 또는 참가 정보가 없습니다.');
    // 에러 처리 또는 초기 화면으로 돌아가는 로직 추가
    menu.style.display = 'flex';
    waitingRoom.style.display = 'none';
    return;
  }
});

// Map selection logic
mapThumbnails.forEach(thumbnail => {
  thumbnail.addEventListener('click', () => {
    mapThumbnails.forEach(t => t.classList.remove('selected'));
    thumbnail.classList.add('selected');
  });
});

joinRoomMainButton.addEventListener('click', () => {
  joinRoomPopup.style.display = 'flex'; // Show popup
  socket.emit('getPublicRooms'); // Request public rooms
});

let selectedPublicRoomId = null;

socket.on('publicRoomsList', (rooms) => {
  publicRoomList.innerHTML = '';
  if (rooms.length === 0) {
    publicRoomList.innerHTML = '<li style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">공개방이 없습니다.</li>';
    return;
  }
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; text-align: left; cursor: pointer; background-color: #f9f9f9;';
    const statusText = room.status === 'playing' ? '게임중' : '대기중';
    const statusColor = room.status === 'playing' ? 'red' : 'green';
    li.innerHTML = `${room.name} (ID: ${room.id.substring(0, 4)}, 인원: ${room.players}/${room.maxPlayers}, 맵: ${room.map}) <span style="color: ${statusColor}; float: right;">${statusText}</span>`;
    li.dataset.roomId = room.id;

    if (room.status === 'playing') {
      li.style.cursor = 'not-allowed';
      li.style.color = '#aaa';
    } else {
      li.addEventListener('click', () => {
        if (selectedPublicRoomId === room.id) {
          selectedPublicRoomId = null;
          li.style.backgroundColor = '#f9f9f9';
        } else {
          const prevSelected = document.querySelector('#publicRoomList li[style*="background-color: #e0e0e0"]');
          if (prevSelected) {
            prevSelected.style.backgroundColor = '#f9f9f9';
          }
          selectedPublicRoomId = room.id;
          li.style.backgroundColor = '#e0e0e0';
        }
      });
    }
    publicRoomList.appendChild(li);
  });
});

popupJoinButton.addEventListener('click', () => {
  let roomIdToJoin = null;
  if (selectedPublicRoomId) {
    roomIdToJoin = selectedPublicRoomId;
  } else {
    roomIdToJoin = privateRoomCodeInput.value.trim();
  }

  if (roomIdToJoin) {
    joinRoomId = roomIdToJoin; // Store room ID for later use
    joinRoomPopup.style.display = 'none'; // Hide join room popup
    characterNicknamePopup.style.display = 'flex'; // Show character and nickname popup
    initializeCharacterSelection(); // Initialize the character selection UI
    selectedPublicRoomId = null; // Reset selected room
  } else {
    alert('공개방을 선택하거나 비밀방 코드를 입력해주세요.');
  }
});

popupCloseButton.addEventListener('click', () => {
  joinRoomPopup.style.display = 'none'; // Hide popup
});

readyButton.addEventListener('click', () => {
  // 닉네임과 캐릭터 정보는 이미 enterWaitingRoomButton에서 서버로 보냈으므로,
  // 여기서는 단순히 '준비' 상태를 서버에 알립니다.
  socket.emit('ready');
});

startGameButton.addEventListener('click', () => {
  if (!startGameButton.disabled) {
    socket.emit('startGameRequest');
  }
});

socket.on('roomCreated', (roomInfo) => {
  waitingRoomIdDisplay.textContent = `ID: ${roomInfo.id}`;
  waitingRoomTitle.textContent = `${roomInfo.name} (ID: ${roomInfo.id})`;
  waitingRoomIdDisplay.style.display = 'none';
  const capitalizedMapName = roomInfo.map.charAt(0).toUpperCase() + roomInfo.map.slice(1);
  currentMapImage.src = `./resources/${capitalizedMapName}.png`;
  currentMapImage.style.display = 'block';
  mapPlaceholderText.style.display = 'none';
  isRoomCreator = true; // Set to true for the room creator
  startGameButton.style.display = 'block'; // Show start game button
});

socket.on('roomJoined', (roomInfo) => {
  waitingRoomIdDisplay.textContent = `ID: ${roomInfo.id}`;
  waitingRoomTitle.textContent = `${roomInfo.name} (ID: ${roomInfo.id})`;
  waitingRoomIdDisplay.style.display = 'none';
  const capitalizedMapName = roomInfo.map.charAt(0).toUpperCase() + roomInfo.map.slice(1);
  currentMapImage.src = `./resources/${capitalizedMapName}.png`;
  currentMapImage.style.display = 'block';
  mapPlaceholderText.style.display = 'none';
});

socket.on('updatePlayers', (players, maxPlayers) => {
  updatePlayers(players, maxPlayers);
  if (isRoomCreator) {
    const allReady = players.every(p => p.ready);
    startGameButton.disabled = !allReady;
  }
});

socket.on('startGame', (gameInfo) => {
  waitingRoom.style.display = 'none';
  controls.style.display = 'block';
  new GameStage3(socket, gameInfo.players, gameInfo.map);
});

socket.on('roomError', (message) => {
  alert(`방 오류: ${message}`);
  menu.style.display = 'flex'; // Show menu again on error
  waitingRoom.style.display = 'none';
  joinRoomPopup.style.display = 'none';
});
