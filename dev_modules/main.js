import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { player } from './player.js';
import { object } from './object.js';
import { Item } from './item.js';
import { math } from './math.js';
import { ui } from './ui.js';
import { hp } from './hp.js';
import { WEAPON_DATA, WeaponFactory, WeaponManager, ATTACK_TYPE_MELEE, ATTACK_TYPE_RANGED } from './weapon_system.js';
import { SoundManager } from './soundManager.js';
import { initMuzzleFlashPool, muzzleFlashPool } from './effects.js';


// 전역에서 한 번만 생성
const gameUI = new ui.GameUI();
const playerHpUI = new hp.HPUI();
playerHpUI.setGameUI(gameUI); // 반드시 연결!
const npcHpUI = new hp.HPUI(true);
const npcUI = new ui.NPCUI();
const playerStatUI = new ui.PlayerStatUI();

// === 디버그 히트박스 전역 플래그 ===
window.DEBUG_MODE_HITBOXES = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'q') {
    window.DEBUG_MODE_HITBOXES = !window.DEBUG_MODE_HITBOXES;
    if (window.playerInstance && typeof window.playerInstance.setDebugHitboxVisible === 'function') {
      window.playerInstance.setDebugHitboxVisible(window.DEBUG_MODE_HITBOXES);
    }
    if (window.npcList && Array.isArray(window.npcList)) {
      window.npcList.forEach(npc => {
        if (npc && typeof npc.setDebugHitboxVisible === 'function') {
          npc.setDebugHitboxVisible(window.DEBUG_MODE_HITBOXES);
        }
      });
    }
  }
});

class GameStage3 {
    constructor() {
        // 이미 생성된 hpUI를 사용
        this.playerHpUI = playerHpUI;
        this.npcHpUI = npcHpUI;
        this.npcUI = npcUI;
        this.playerStatUI = playerStatUI;
        this.healthLogTimer_ = 0; // 헬스 로그 타이머 초기화
        this.npcs_ = []; // NPC들을 저장할 배열
        this.weapons_ = []; // 무기 아이템들을 저장할 배열 초기화
        this.weaponSpawnTimer_ = 0; // 무기 소환 타이머
        this.weaponSpawnInterval_ = 10; // 무기 소환 주기 (10초)
        this.MAX_WEAPONS_ON_MAP = 10; // 맵에 존재할 수 있는 최대 무기 개수
        this.soundManager = null; // SoundManager 인스턴스
        this.Initialize();
        this.RAF();
    }

    Initialize() {
        // WebGL 렌더러
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaFactor = 2.2;
        document.getElementById('container').appendChild(this.renderer.domElement);

        // 카메라
        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 2000.0;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(-8, 6, 12);
        this.camera.lookAt(0, 2, 0);

        // SoundManager 초기화 및 사운드 로드
        this.soundManager = new SoundManager(this.camera);
        this.loadGameSounds();

        // 씬
        this.scene = new THREE.Scene();

        // 총구 화염 이펙트 풀 초기화
        initMuzzleFlashPool(this.scene, 20);

        // 환경
        this.SetupLighting();
        this.SetupSkyAndFog();
        this.CreateGround();
        for (let i = 0; i < this.MAX_WEAPONS_ON_MAP; i++) {
            this.spawnSingleWeapon(); // 게임 시작 시 MAX_WEAPONS_ON_MAP 개수만큼 무기 생성
        }
        this.CreatePlayer();

        this.CreateCoordinateDisplays();

        // 'R' 키를 눌렀을 때 NPC 공격
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR') {
                if (this.npc_ && typeof this.npc_.startAttack === 'function') {
                    this.npc_.startAttack();
                }
            }
        });

        window.addEventListener('resize', () => this.OnWindowResize(), false);
    }

    loadGameSounds() {
        // 사운드 파일 로드 (비동기 처리)
        this.soundManager.loadSound('attack_swing', 'resources/audio/attack_swing.mp3');
        this.soundManager.loadSound('hit_impact', 'resources/audio/hit_impact.mp3');
        this.soundManager.loadSound('jump_sound', 'resources/audio/jump_sound.mp3');
        // 필요한 다른 사운드들도 여기에 추가
    }

    SetupLighting() {
        // 방향성 조명
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
        directionalLight.position.set(60, 100, 10);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.bias = -0.001;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 1.0;
        directionalLight.shadow.camera.far = 200.0;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);

        // 반구 조명
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0xF6F47F, 0.6);
        this.scene.add(hemisphereLight);
    }

    SetupSkyAndFog() {
        // 하늘 셰이더
        const skyUniforms = {
            topColor: { value: new THREE.Color(0x0077FF) },
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

        // 안개
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
    }

    CreateGround() {
        // 잔디 텍스처
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('resources/Map.png');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(2, 2);

        // 바닥 메쉬
        const groundGeometry = new THREE.PlaneGeometry(80, 80, 10, 10);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: grassTexture,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    CreatePlayer() {
        // 플레이어 생성 및 HP UI 연결
        this.player_ = new player.Player({
            scene: this.scene,
            hpUI: this.playerHpUI,
            weapons: this.weapons_,
            npcs: this.npcs_, // NPC 목록을 플레이어에게 전달
            soundManager: this.soundManager, // SoundManager 전달
            camera: this.camera // 카메라 인스턴스 전달
        });
        this.playerHpUI.setTarget(this.player_);
        this.playerStatUI.show('Player');
        // === 추가: window.playerInstance 할당 ===
        window.playerInstance = this.player_;
        // NPC 생성
        const npcPos = new THREE.Vector3(0, 0, -4);
        const newNpc = new object.NPC(this.scene, npcPos, 'Viking Warrior', this.soundManager);
        this.npcs_.push(newNpc); // NPC 배열에 추가
        this.npc_ = newNpc; // 기존 this.npc_ 참조 유지 (단일 NPC의 경우)
        this.npcHpUI.setTarget(this.npc_);
        // === 추가: window.npcList 할당 ===
        window.npcList = this.npcs_;

        // 카메라 오프셋 및 회전
        this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
        this.rotationAngle = 4.715;

        // 마우스 드래그로 카메라 회전
        window.addEventListener('mousemove', (e) => this.OnMouseMove(e), false);

        // 캐릭터 모델 로딩 후 얼굴 이미지 추출해서 HP UI에 반영
        const checkAndRenderFace = () => {
            if (this.player_ && this.player_.mesh_) {
                this.playerHpUI.renderCharacterFaceToProfile(this.player_.mesh_, this.scene, this.renderer);
            } else {
                setTimeout(checkAndRenderFace, 100);
            }
        };
        checkAndRenderFace();

        const checkAndRenderNPCFace = () => {
            if (this.npc_ && this.npc_.model_) {
                this.npcHpUI.renderCharacterFaceToProfile(this.npc_.model_, this.scene, this.renderer);
            } else {
                setTimeout(checkAndRenderNPCFace, 100);
            }
        };
        checkAndRenderNPCFace();
    }

    CreateCoordinateDisplays() {
        const style = {
            position: 'absolute',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: '1000',
            pointerEvents: 'none',
            userSelect: 'none',
            transform: 'translate(-50%, -50%)'
        };

        this.playerCoordDisplay = document.createElement('div');
        Object.assign(this.playerCoordDisplay.style, style);
        document.body.appendChild(this.playerCoordDisplay);

        
    }

    CreateWeapons() {
        this.weapons_ = [];
    }

    spawnSingleWeapon() {
        if (this.weapons_.length >= this.MAX_WEAPONS_ON_MAP) {
            return; // 최대 개수에 도달하면 생성하지 않음
        }

        const weaponNames = Object.keys(WEAPON_DATA);
        const randomIndex = math.rand_int(0, weaponNames.length - 1);
        const weaponName = weaponNames[randomIndex];

        // Potion은 특정 위치에만 생성되도록 예외 처리
        let pos;
        if (weaponName === 'Potion1_Filled.fbx') {
            pos = new THREE.Vector3(0, 1, 4);
        } else {
            pos = new THREE.Vector3(math.rand_int(-20, 20), 1, math.rand_int(-20, 20));
        }

        const weaponData = WEAPON_DATA[weaponName];
        if (weaponData) {
            const weapon = new Item(this.scene, weaponName, pos, weaponData.type, weaponData.radius, weaponData.angle, weaponData.damage, weaponData.attackSpeedMultiplier, weaponData.attackType, weaponData.specialEffect, weaponData.statEffect);
            this.weapons_.push(weapon);
            console.log(`무기 생성: ${weaponName} (현재 ${this.weapons_.length}개)`);
        } else {
            console.warn(`무기 데이터를 찾을 수 없습니다: ${weaponName}`);
        }
    }

    OnMouseMove(event) {
        if (event.buttons === 1) {
            const deltaX = event.movementX || 0;
            this.rotationAngle -= deltaX * 0.005;
        }
    }

    UpdateCamera() {
        if (!this.player_ || !this.player_.mesh_) return;
        const target = this.player_.mesh_.position.clone();
        const offset = this.cameraTargetOffset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationAngle);
        const cameraPos = target.clone().add(offset);
        this.camera.position.copy(cameraPos);
        // 머리 위를 바라보게
        const headOffset = new THREE.Vector3(0, 2, 0);
        const headPosition = target.clone().add(headOffset);
        this.camera.lookAt(headPosition);
    }

    OnWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    RAF(time) {
        requestAnimationFrame((t) => this.RAF(t));
        if (!this.prevTime) this.prevTime = time || performance.now();
        const delta = ((time || performance.now()) - this.prevTime) * 0.001;
        this.prevTime = time || performance.now();

        // 무기 소환 타이머 업데이트 및 소환
        this.weaponSpawnTimer_ += delta;
        if (this.weaponSpawnTimer_ >= this.weaponSpawnInterval_) {
            this.spawnSingleWeapon();
            this.weaponSpawnTimer_ = 0;
        }

        if (this.player_) {
            this.player_.Update(delta, this.rotationAngle);
            this.UpdateCamera();
            this.playerHpUI.updateHP(this.player_.hp_);
            if (this.player_.mesh_) {
                const stats = {
                    health: `${this.player_.hp_} / ${this.player_.maxHp_}`,
                    speed: this.player_.speed_,
                    strength: this.player_.strength_,
                    agility: this.player_.agility_,
                    stamina: this.player_.stamina_
                };
                // 마지막 투사체 정보 추가
                if (this.player_.lastMeleeProjectile && !this.player_.lastMeleeProjectile.isDestroyed) {
                  stats.projectilePosition = this.player_.lastMeleeProjectile.position;
                  stats.projectileRadius = this.player_.lastMeleeProjectile.radius;
                }
                this.playerStatUI.updateStats(stats);
            }
        }
        if (this.npc_ && this.npc_.model_) {
            this.npc_.Update(delta);
            this.npcHpUI.updateHP(this.npc_.health_);

            // Update NPC UI position and visibility
            const npcWorldPosition = new THREE.Vector3();
            if (this.npc_.headBone) {
                this.npc_.headBone.getWorldPosition(npcWorldPosition);
            } else {
                npcWorldPosition.copy(this.npc_.model_.position);
            }
            npcWorldPosition.y += 2.0; // Offset above head

            const screenPosition = npcWorldPosition.clone().project(this.camera);

            const width = window.innerWidth, height = window.innerHeight;
            const x = (screenPosition.x * width / 2) + width / 2;
            const y = -(screenPosition.y * height / 2) + height / 2;

            // Check if NPC is on screen
            const isBehind = screenPosition.z > 1;
            const isOnScreen = x > 0 && x < width && y > 0 && y < height && !isBehind;

            if (isOnScreen) {
                this.npcUI.show(this.npc_.name, this.npc_.health_);
                this.npcUI.updatePosition(x + 50, y); // Position to the right of the NPC
            } else {
                this.npcUI.hide();
            }
        }

        this.UpdateCoordinateDisplays();

        

        this.renderer.render(this.scene, this.camera);
        this.player_.attackSystem.update(delta, this.npcs_); // 투사체 시스템 업데이트
        if (muzzleFlashPool) {
            muzzleFlashPool.update(delta);
        }
        this.UpdateCombat(delta);
    }

    UpdateCombat(delta) {
        if (!this.player_ || !this.player_.mesh_ || this.npcs_.length === 0) {
            return;
        }

        const playerPosition = this.player_.mesh_.position;
        const playerRadius = this.player_.hitboxRadius_;

        this.npcs_.forEach(npc => {
            if (!npc.model_ || npc.isDead_) return; // NPC 모델이 없거나 죽었으면 스킵

            const npcPosition = npc.model_.position;
            const npcRadius = npc.hitboxRadius_;

            const distanceVector = new THREE.Vector3().subVectors(playerPosition, npcPosition);
            distanceVector.y = 0; // Y축은 무시하고 XZ 평면에서만 충돌 처리
            const distance = distanceVector.length();

            const minDistance = playerRadius + npcRadius;

            if (distance < minDistance) {
                // 충돌 발생
                const overlap = minDistance - distance;
                const direction = distanceVector.normalize();

                // 플레이어와 NPC를 서로 밀어냄
                // 각자의 질량이나 다른 요소를 고려하여 밀어내는 정도를 조절할 수 있음
                // 여기서는 간단하게 절반씩 밀어냅니다.
                const pushAmount = direction.multiplyScalar(overlap / 2);

                this.player_.mesh_.position.add(pushAmount);
                this.player_.position_.copy(this.player_.mesh_.position); // 플레이어 내부 위치도 업데이트

                npc.model_.position.sub(pushAmount);
                // NPC의 내부 위치도 업데이트가 필요하다면 여기에 추가
            }
        });

        // NPC가 플레이어를 공격하는 로직 - 비활성화됨
        // 플레이어가 가까이 가도 NPC가 공격하지 않도록 설정
        /*
        this.npcs_.forEach(npc => {
            if (!npc.model_ || npc.isDead_) return; // NPC 모델이 없거나 죽었으면 스킵

            const playerPos = new THREE.Vector2(this.player_.mesh_.position.x, this.player_.mesh_.position.z);
            const npcPos = new THREE.Vector2(npc.model_.position.x, npc.model_.position.z);
            const distance = playerPos.distanceTo(npcPos);

            // NPC AI: 플레이어가 공격 범위 내에 있고 쿨타임이 끝났으면 공격 시작
            if (distance <= npc.attackRadius && npc.attackCooldownTimer_ <= 0 && !npc.isAttacking_ && !npc.isHit_) {
                npc.startAttack();
            }

            // 공격 판정 및 피해 적용
            if (distance <= npc.attackRadius && npc.isAttacking_ && npc.canDamage_) {
                    const npcToPlayer = this.player_.mesh_.position.clone().sub(npc.model_.position);
                    npcToPlayer.y = 0;
                    npcToPlayer.normalize();

                    const npcForward = new THREE.Vector3(0, 0, 1).applyQuaternion(npc.model_.quaternion);
                    npcForward.y = 0;
                    npcForward.normalize();

                    const angle = npcForward.angleTo(npcToPlayer);

                    if (angle <= npc.attackAngle_ / 2) {
                        this.player_.TakeDamage(20); // 플레이어에게 20의 피해
                        npc.canDamage_ = false; // 한 번의 공격에 한 번만 피해를 주도록 설정
                        console.log(`NPC attacks Player! Player HP: ${this.player_.hp_}`);
                    }
                }
            }
        );
        */
    }

    UpdateCoordinateDisplays() {
        if (this.player_ && this.player_.mesh_) {
            this.UpdateCoordDisplay(this.playerCoordDisplay, this.player_.mesh_, this.player_.headBone, 2.0);
        }
        
    }

    UpdateCoordDisplay(element, model, headBone, heightOffset) {
        const pos = new THREE.Vector3();
        if (headBone) {
            headBone.getWorldPosition(pos);
        } else {
            pos.copy(model.position);
        }
        pos.y += heightOffset; // 머리 위로 오프셋

        pos.project(this.camera);

        const width = window.innerWidth, height = window.innerHeight;
        const widthHalf = width / 2, heightHalf = height / 2;

        pos.x = (pos.x * widthHalf) + widthHalf;
        pos.y = - (pos.y * heightHalf) + heightHalf;

        element.style.top = `${pos.y}px`;
        element.style.left = `${pos.x}px`;

        const worldPos = model.position;
        element.textContent = `X: ${worldPos.x.toFixed(1)}, Y: ${worldPos.y.toFixed(1)}, Z: ${worldPos.z.toFixed(1)}`;
    }
}

// 게임 인스턴스 생성
let game = null;
window.addEventListener('DOMContentLoaded', () => {
    game = new GameStage3();
});
