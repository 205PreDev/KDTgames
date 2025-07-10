import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { player } from './player.js';
import { object } from './object.js';
import { Item } from './item.js';
import { math } from './math.js';
import { ui } from './ui.js';
import { hp } from './hp.js';

// Attack Types
const ATTACK_TYPE_MELEE = 'melee';
const ATTACK_TYPE_RANGED = 'ranged';

// Weapon Data (Radius and Angle)
const WEAPON_DATA = {
    'Sword.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.0, angle: Math.PI / 3, damage: 20, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null }, // 60 degrees
    'Axe_Double.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.2, angle: Math.PI / 2.5, damage: 30, attackSpeedMultiplier: 0.8, attackType: 'aoe', specialEffect: 'knockback' }, // 72 degrees
    'Bow_Wooden.fbx': { type: ATTACK_TYPE_RANGED, radius: 15.0, angle: Math.PI / 18, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 10 degrees (for aiming)
    'Dagger.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.5, angle: Math.PI / 2, damage: 15, attackSpeedMultiplier: 1.5, attackType: 'single', specialEffect: 'critical_bleed' }, // 90 degrees
    'Hammer_Double.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.5, angle: Math.PI / 2.2, damage: 40, attackSpeedMultiplier: 0.5, attackType: 'small_aoe', specialEffect: 'stun' }, // ~81 degrees

    'AssaultRifle_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 20.0, angle: Math.PI / 36, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 5 degrees
    'Pistol_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 10.0, angle: Math.PI / 12, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 15 degrees
    'Shotgun_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 8.0, angle: Math.PI / 6, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 30 degrees
    'SniperRifle_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 30.0, angle: Math.PI / 90, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 2 degrees
    'SubmachineGun_1.fbx': { type: ATTACK_TYPE_RANGED, radius: 12.0, angle: Math.PI / 18, damage: 10, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null }, // 10 degrees

    'Axe_Double_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.4, angle: Math.PI / 2.4, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Axe_small_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.8, angle: Math.PI / 2.1, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Bow_Golden.fbx': { type: ATTACK_TYPE_RANGED, radius: 18.0, angle: Math.PI / 20, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'ranged', specialEffect: null },
    'Dagger_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 1.7, angle: Math.PI / 1.9, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Hammer_Double_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.7, angle: Math.PI / 2.1, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Sword_big_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.8, angle: Math.PI / 3.2, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Sword_big.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.6, angle: Math.PI / 3.1, damage: 20, attackSpeedMultiplier: 0.9, attackType: 'single', specialEffect: null },
    'Sword_Golden.fbx': { type: ATTACK_TYPE_MELEE, radius: 2.1, angle: Math.PI / 2.9, damage: 25, attackSpeedMultiplier: 1.0, attackType: 'single', specialEffect: null },
    'Potion1_Filled.fbx': { type: 'buff', radius: 0.5, angle: 0, damage: 0, attackSpeedMultiplier: 0, attackType: 'none', specialEffect: null, statEffect: { stat: 'strength', amount: 1 } }
};


// 전역에서 한 번만 생성
const gameUI = new ui.GameUI();
const playerHpUI = new hp.HPUI();
playerHpUI.setGameUI(gameUI); // 반드시 연결!
const npcHpUI = new hp.HPUI(true);
const npcUI = new ui.NPCUI();
const playerStatUI = new ui.PlayerStatUI();

class GameStage3 {
    constructor() {
        // 이미 생성된 hpUI를 사용
        this.playerHpUI = playerHpUI;
        this.npcHpUI = npcHpUI;
        this.npcUI = npcUI;
        this.playerStatUI = playerStatUI;
        this.healthLogTimer_ = 0; // 헬스 로그 타이머 초기화
        this.npcs_ = []; // NPC들을 저장할 배열
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

        // 씬
        this.scene = new THREE.Scene();

        // 환경
        this.SetupLighting();
        this.SetupSkyAndFog();
        this.CreateGround();
        this.CreateWeapons();
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
            npcs: this.npcs_ // NPC 목록을 플레이어에게 전달
        });
        this.playerHpUI.setTarget(this.player_);
        this.playerStatUI.show('Player');

        // NPC 생성
        const npcPos = new THREE.Vector3(0, 0, -4);
        const newNpc = new object.NPC(this.scene, npcPos, 'Viking Warrior');
        this.npcs_.push(newNpc); // NPC 배열에 추가
        this.npc_ = newNpc; // 기존 this.npc_ 참조 유지 (단일 NPC의 경우)
        this.npcHpUI.setTarget(this.npc_);

        // 카메라 오프셋 및 회전
        this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
        this.rotationAngle = 4.715;

        // 마우스 드래그로 카메라 회전
        window.addEventListener('mousemove', (e) => this.OnMouseMove(e), false);

        // 캐릭터 모델 로딩 후 얼굴 이미지 추출해서 HP UI에 반영
        const checkAndRenderFace = () => {
            if (this.player_ && this.player_.mesh_) {
                console.log('Calling renderCharacterFaceToProfile for player with mesh:', this.player_.mesh_);
                this.playerHpUI.renderCharacterFaceToProfile(this.player_.mesh_, this.scene, this.renderer);
            } else {
                setTimeout(checkAndRenderFace, 100);
            }
        };
        checkAndRenderFace();

        const checkAndRenderNPCFace = () => {
            if (this.npc_ && this.npc_.model_) {
                console.log('Calling renderCharacterFaceToProfile for NPC with model:', this.npc_.model_);
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
        const weaponNames = [
            'Sword.fbx', 'Axe_Double.fbx', 'Bow_Wooden.fbx', 'Dagger.fbx', 'Hammer_Double.fbx',
            'AssaultRifle_1.fbx', 'Pistol_1.fbx', 'Shotgun_1.fbx', 'SniperRifle_1.fbx', 'SubmachineGun_1.fbx',
            'Axe_Double_Golden.fbx', 'Axe_small_Golden.fbx', 'Bow_Golden.fbx', 'Dagger_Golden.fbx',
            'Hammer_Double_Golden.fbx', 'Sword_big_Golden.fbx', 'Sword_big.fbx', 'Sword_Golden.fbx',
            'Potion1_Filled.fbx' // Added Potion
        ];
        for (let i = 0; i < weaponNames.length; i++) {
            const weaponName = weaponNames[i];
            let pos;
            if (weaponName === 'Potion.fbx') {
                pos = new THREE.Vector3(0, 1, 4); // Specific position for Potion
            } else {
                pos = new THREE.Vector3(math.rand_int(-20, 20), 1, math.rand_int(-20, 20));
            }
            const weaponData = WEAPON_DATA[weaponName];
            const weapon = new Item(this.scene, weaponName, pos, weaponData.type, weaponData.radius, weaponData.angle, weaponData.damage, weaponData.attackSpeedMultiplier, weaponData.attackType, weaponData.specialEffect, weaponData.statEffect);
            this.weapons_.push(weapon);
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

        if (this.player_) {
            this.player_.Update(delta, this.rotationAngle);
            this.UpdateCamera();
            this.playerHpUI.updateHP(this.player_.hp_);
            if (this.player_.mesh_) {
                const stats = {
                    position: this.player_.mesh_.position,
                    health: `${this.player_.hp_} / ${this.player_.maxHp_}`,
                    attack: this.player_.currentAttackDamage,
                    speed: this.player_.speed_,
                    strength: this.player_.strength_,
                    agility: this.player_.agility_,
                    stamina: this.player_.stamina_
                };
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

        // 5초마다 NPC 체력 로그
        this.healthLogTimer_ += delta;
        if (this.healthLogTimer_ >= 5.0) {
            if (this.npc_) {
                console.log(`NPC Health (5s interval): ${this.npc_.health_}`);
            }
            this.healthLogTimer_ = 0;
        }

        this.renderer.render(this.scene, this.camera);
        this.UpdateCombat(delta);
    }

    UpdateCombat(delta) {
        if (!this.player_ || !this.player_.mesh_ || this.npcs_.length === 0) {
            return;
        }

        // NPC가 플레이어를 공격하는 로직
        this.npcs_.forEach(npc => {
            if (!npc.model_ || npc.isDead_) return; // NPC 모델이 없거나 죽었으면 스킵

            const playerPos = new THREE.Vector2(this.player_.mesh_.position.x, this.player_.mesh_.position.z);
            const npcPos = new THREE.Vector2(npc.model_.position.x, npc.model_.position.z);
            const distance = playerPos.distanceTo(npcPos);

            if (distance <= npc.attackRadius) { // NPC의 공격 반경 사용
                if (npc.isAttacking_ && npc.canDamage_) {
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
        });
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
