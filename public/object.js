// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import * as map from './map.js'; // map.js import

export const object = (() => {
  // NPC 클래스 - 루트 버전에서 가져온 고급 NPC 기능
  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), name = 'NPC', soundManager = null, socket = null, roomId = null) {
      this.scene_ = scene;
      this.soundManager_ = soundManager; // SoundManager 인스턴스 추가
      this.socket_ = socket; // 소켓 인스턴스 추가 (멀티플레이어 지원)
      this.roomId_ = roomId; // 방 ID 추가 (멀티플레이어 지원)
      this.id_ = THREE.MathUtils.generateUUID(); // 고유 ID 생성
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.maxHealth_ = 150;
      this.health_ = this.maxHealth_;
      this.name_ = name;
      this.isAttacking_ = false;
      this.canDamage_ = false;
      this.attackCooldown_ = 2.0;
      this.attackCooldownTimer_ = 0;
      this.headBone = null;
      this.attackAngle_ = Math.PI / 1.5;
      this.attackRadius = 2.0;
      this.attackDamage = 15;
      this.isCurrentAnimationAttack_ = false;
      this.isDead_ = false;
      this.respawnTimer_ = 0;
      this.collidables_ = []; // 충돌 대상 오브젝트 배열 (멀티플레이어 버전과 호환성 유지)
      this.debugHelpers_ = []; // 디버그용 바운딩 박스 배열 (멀티플레이어 버전과 호환성 유지)
      this.LoadModel_(position);
      this.debugHitboxMesh_ = null;
      this.debugHitboxVisible_ = false;
      this.hitboxRadius_ = 0.7;
      this.hitboxHeight_ = 1.6;
      if (scene) {
        this.debugHitboxMesh_ = this.createDebugHitboxMesh();
        scene.add(this.debugHitboxMesh_);
      }
    }

    TakeDamage(damage, attacker) {
      if (this.isDead_) return;

      const oldHealth = this.health_;
      this.health_ -= damage;
      if (this.health_ < 0) {
        this.health_ = 0;
      }
      if (this.health_ <= 0) {
        this.health_ = 0;
        this.isDead_ = true;
        this.respawnTimer_ = 5.0;
        this.SetAnimation_('Death');
        console.log(`NPC ${this.name_} took ${damage} damage and died. Health: ${this.health_}`);
        
        // 멀티플레이어 환경에서 NPC 사망 이벤트 브로드캐스트
        if (this.socket_ && this.roomId_) {
          this.socket_.emit('npc_died', {
            roomId: this.roomId_,
            npcId: this.id_,
            killedBy: attacker ? attacker.id : null
          });
        }
      } else {
        // 피격 중에도 무적 없음: 항상 ReceiveHit 재생
        this.SetAnimation_('ReceiveHit');
        if (this.soundManager_) {
          this.soundManager_.playSound('hit_impact');
        }
        console.log(`NPC ${this.name_} took ${damage} damage. Health: ${oldHealth} → ${this.health_}`);
        
        // 멀티플레이어 환경에서 NPC 피격 이벤트 브로드캐스트
        if (this.socket_ && this.roomId_) {
          this.socket_.emit('npc_damaged', {
            roomId: this.roomId_,
            npcId: this.id_,
            health: this.health_,
            maxHealth: this.maxHealth_,
            attackerId: attacker ? attacker.id : null
          });
        }
      }
    }

    LoadModel_(position) {
      const loader = new GLTFLoader();
      loader.setPath('./resources/char/glTF/');
      loader.load('Viking_Male.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(1);
        model.position.copy(position);

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
          if (c.isBone && c.name === 'Head') {
            this.headBone = c;
          }
        });

        this.scene_.add(model);
        this.model_ = model;

        this.mixer_ = new THREE.AnimationMixer(model);
        this.mixer_.addEventListener('finished', (e) => {
          if (e.action.getClip().name === 'Attack') { // NPC 공격 애니메이션 이름이 'Attack'이라고 가정
            this.isAttacking_ = false;
            this.canDamage_ = false; // 공격 판정 초기화
            this.SetAnimation_('Idle'); // 공격 후 Idle로 전환
          } else if (e.action.getClip().name === 'Death') {
            this.model_.visible = false; // 죽음 애니메이션 후 모델 숨기기
          }
        });

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
        
        // 멀티플레이어 환경에서 NPC 생성 이벤트 브로드캐스트
        if (this.socket_ && this.roomId_) {
          this.socket_.emit('npc_spawned', {
            roomId: this.roomId_,
            npcId: this.id_,
            position: {
              x: position.x,
              y: position.y,
              z: position.z
            },
            name: this.name_,
            health: this.health_,
            maxHealth: this.maxHealth_
          });
        }
      }, undefined, (error) => {
        console.error("Error loading NPC model:", error);
      });
    }

    Respawn_() {
      this.health_ = this.maxHealth_;
      this.isDead_ = false;
      this.respawnTimer_ = 0;
      this.model_.visible = true;

      // 무작위 위치로 이동 (맵 경계 내에서)
      const minX = map.MAP_BOUNDS.minX;
      const maxX = map.MAP_BOUNDS.maxX;
      const minZ = map.MAP_BOUNDS.minZ;
      const maxZ = map.MAP_BOUNDS.maxZ;
      const minY = map.MAP_BOUNDS.minY;

      const randomX = Math.random() * (maxX - minX) + minX;
      const randomZ = Math.random() * (maxZ - minZ) + minZ;
      this.model_.position.set(randomX, minY, randomZ);

      this.SetAnimation_('Idle');
      
      // 멀티플레이어 환경에서 NPC 리스폰 이벤트 브로드캐스트
      if (this.socket_ && this.roomId_) {
        this.socket_.emit('npc_respawned', {
          roomId: this.roomId_,
          npcId: this.id_,
          position: {
            x: randomX,
            y: minY,
            z: randomZ
          },
          health: this.health_,
          maxHealth: this.maxHealth_
        });
      }
    }

    SetAnimation_(name) {
      const animName = this.animations_[name] ? name : 'Idle';
      if (!this.animations_[animName]) {
        console.warn(`NPC Animation ${name} not found! Using Idle instead.`);
        return;
      }

      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.2);
      }
      this.currentAction_ = this.animations_[animName];
      this.currentAction_.reset().fadeIn(0.2).play();

      if (name === 'Death') {
        this.currentAction_.setLoop(THREE.LoopOnce, 1);
        this.currentAction_.clampWhenFinished = true;
      } else if (name === 'Attack') { // NPC 공격 애니메이션 이름이 'Attack'이라고 가정
        this.currentAction_.setLoop(THREE.LoopOnce, 1);
        this.currentAction_.clampWhenFinished = true;
      }
      
      // 멀티플레이어 환경에서 NPC 애니메이션 변경 이벤트 브로드캐스트
      if (this.socket_ && this.roomId_ && !this.isDead_) {
        this.socket_.emit('npc_animation_change', {
          roomId: this.roomId_,
          npcId: this.id_,
          animation: name
        });
      }
    }

    createDebugHitboxMesh() {
      const geometry = new THREE.CylinderGeometry(this.hitboxRadius_, this.hitboxRadius_, this.hitboxHeight_, 16, 1, true);
      const material = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(this.model_ ? this.model_.position : new THREE.Vector3());
      mesh.position.y += this.hitboxHeight_ / 2;
      mesh.visible = this.debugHitboxVisible_;
      return mesh;
    }

    setDebugHitboxVisible(visible) {
      this.debugHitboxVisible_ = visible;
      if (this.debugHitboxMesh_) {
        this.debugHitboxMesh_.visible = visible;
      }
    }

    // 플레이어와의 충돌 감지 및 공격 로직
    CheckPlayerInteraction(players, timeElapsed) {
      if (this.isDead_) return;
      
      // 공격 쿨다운 업데이트
      if (this.attackCooldownTimer_ > 0) {
        this.attackCooldownTimer_ -= timeElapsed;
      }
      
      // 공격 중이면 처리하지 않음
      if (this.isAttacking_) return;
      
      // 가장 가까운 플레이어 찾기
      let closestPlayer = null;
      let closestDistance = Infinity;
      
      for (const player of players) {
        if (player.isDead) continue;
        
        const distance = this.model_.position.distanceTo(player.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayer = player;
        }
      }
      
      // 가까운 플레이어가 있고 공격 범위 내에 있으면 공격
      if (closestPlayer && closestDistance < this.attackRadius && this.attackCooldownTimer_ <= 0) {
        this.Attack(closestPlayer);
      }
    }
    
    // 공격 로직
    Attack(target) {
      if (this.isDead_ || this.isAttacking_) return;
      
      this.isAttacking_ = true;
      this.SetAnimation_('Attack');
      this.attackCooldownTimer_ = this.attackCooldown_;
      
      // 공격 판정 활성화 (애니메이션 중간에 데미지 판정)
      setTimeout(() => {
        if (this.isDead_) return;
        
        this.canDamage_ = true;
        
        // 타겟이 아직 공격 범위 내에 있는지 확인
        if (this.model_ && target && this.model_.position.distanceTo(target.position) < this.attackRadius) {
          // 타겟에게 데미지 적용
          if (typeof target.takeDamage === 'function') {
            target.takeDamage(this.attackDamage, this);
            
            if (this.soundManager_) {
              this.soundManager_.playSound('monster_attack');
            }
          }
        }
        
        // 공격 판정 비활성화
        setTimeout(() => {
          this.canDamage_ = false;
        }, 200);
      }, 500); // 공격 애니메이션 중간 시점에 데미지 판정
    }
    
    // 키 입력으로 공격 시작 (main.js에서 호출)
    startAttack() {
      // 가장 가까운 플레이어 찾기
      if (window.playerInstance) {
        this.Attack(window.playerInstance);
      } else {
        // 플레이어 인스턴스가 없으면 그냥 공격 애니메이션만 재생
        this.isAttacking_ = true;
        this.SetAnimation_('Attack');
        this.attackCooldownTimer_ = this.attackCooldown_;
        
        // 공격 판정 비활성화
        setTimeout(() => {
          this.isAttacking_ = false;
          this.canDamage_ = false;
        }, 1000);
      }
    }

    Update(timeElapsed, players = []) {
      if (this.isDead_) {
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        this.respawnTimer_ -= timeElapsed;
        if (this.respawnTimer_ <= 0) {
          this.Respawn_();
        }
        return;
      }

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
      
      // 플레이어와의 상호작용 체크 (멀티플레이어 지원)
      if (players.length > 0) {
        this.CheckPlayerInteraction(players, timeElapsed);
      }
      
      if (this.debugHitboxMesh_ && this.model_) {
        this.debugHitboxMesh_.position.copy(this.model_.position);
        this.debugHitboxMesh_.position.y += this.hitboxHeight_ / 2;
        this.debugHitboxMesh_.visible = this.debugHitboxVisible_ && window.DEBUG_MODE_HITBOXES;
      }
    }
    
    // 네트워크 동기화를 위한 상태 데이터 가져오기
    GetState() {
      if (!this.model_) return null;
      
      return {
        id: this.id_,
        position: {
          x: this.model_.position.x,
          y: this.model_.position.y,
          z: this.model_.position.z
        },
        health: this.health_,
        maxHealth: this.maxHealth_,
        isDead: this.isDead_,
        name: this.name_,
        animation: this.currentAction_ ? this.currentAction_.getClip().name : 'Idle'
      };
    }
    
    // 네트워크에서 받은 상태로 업데이트
    UpdateFromState(state) {
      if (!this.model_ || !state) return;
      
      // 위치 업데이트
      if (state.position) {
        this.model_.position.set(state.position.x, state.position.y, state.position.z);
      }
      
      // 체력 업데이트
      if (state.health !== undefined) {
        this.health_ = state.health;
        this.maxHealth_ = state.maxHealth || this.maxHealth_;
      }
      
      // 사망 상태 업데이트
      if (state.isDead !== undefined && this.isDead_ !== state.isDead) {
        this.isDead_ = state.isDead;
        if (this.isDead_) {
          this.SetAnimation_('Death');
        }
      }
      
      // 애니메이션 업데이트
      if (state.animation && !this.isDead_) {
        this.SetAnimation_(state.animation);
      }
    }
    
    // 멀티플레이어 버전과의 호환성을 위한 메서드들
    
    // 충돌 대상 오브젝트 배열 반환 (멀티플레이어 버전과 호환성 유지)
    GetCollidables() {
      return this.collidables_;
    }
    
    // 디버그 시각화 토글 (멀티플레이어 버전과 호환성 유지)
    ToggleDebugVisuals(visible) {
      this.setDebugHitboxVisible(visible);
      
      // 디버그 헬퍼 표시 설정
      this.debugHelpers_.forEach((helper) => {
        if (helper) {
          helper.visible = visible;
        }
      });
    }
  }

  class NatureObject {
    constructor(scene, params = {}) {
      this.scene_ = scene;
      this.models_ = [];
      this.collidables_ = []; // 충돌 대상 오브젝트 배열
      this.debugHelpers_ = []; // 디버그용 바운딩 박스 배열
      this.LoadModels_();
    }

    LoadModels_() {
      const fbxLoader = new FBXLoader();
      fbxLoader.setPath('./resources/Buildings-pack-Aug-2017/FBX/');

      const gltfLoader = new GLTFLoader();
      gltfLoader.setPath('./resources/Nature-Kit/Models/GLTF-format/');

      const carLoader = new GLTFLoader();
      carLoader.setPath('./resources/kenney_car-kit/Models/GLB-format/');

      const textureLoader = new THREE.TextureLoader();

      const modelsToLoad = [
        // House2.fbx에 다중 바운딩 박스 적용
        {
          type: 'fbx',
          filename: 'House2.fbx',
          texture: 'HouseTexture1.png',
          position: new THREE.Vector3(-33, 0, -33),
          scale: 0.06,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 7, height: 5, depth: 8 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 5, height: 2, depth: 5 }, offset: new THREE.Vector3(0, 5, 0) },
          ],
        },
        {
          type: 'fbx',
          filename: 'Hospital.fbx',
          texture: 'HouseTexture3.png',
          position: new THREE.Vector3(32, 0, -34),
          scale: 0.03,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 12, height: 12, depth: 9 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4.5, height: 0.5, depth: 4.5 }, offset: new THREE.Vector3(0, 3.5, 3.7) },
          ],
        },
        {
          type: 'fbx',
          filename: 'Shop.fbx',
          texture: 'HouseTexture4.png',
          position: new THREE.Vector3(20, 0, -34),
          scale: 0.05,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 10, height: 7, depth: 7.5 },
        },
        {
          type: 'fbx',
          filename: 'House3.fbx',
          texture: 'HouseTexture2.png',
          position: new THREE.Vector3(33, 0, 32.5),
          scale: 0.06,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 8, height: 6, depth: 7 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 6, height: 5, depth: 6 }, offset: new THREE.Vector3(0, 6, 0) },
          ],
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-28.1, 0.1, 0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-29.3, 0.1, -0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(80), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-30.5, 0.1, 0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-31.7, 0.1, -0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(80), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-32.9, 0.1, 0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-34.1, 0.1, -0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(80), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-35.3, 0.1, 0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
        },
        {
          type: 'glb',
          filename: 'path_stone.glb',
          position: new THREE.Vector3(-36.5, 0.1, -0.8),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(80), 0),
        },
        {
          type: 'glb',
          filename: 'tent_detailedOpen.glb',
          position: new THREE.Vector3(-31.8, 0.1, -8.5),
          scale: 8,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(150), 0),
          collidable: true,
          boundingBoxSize: { width: 5, height: 4, depth: 5 },
        },
        {
          type: 'glb',
          filename: 'campfire_planks.glb',
          position: new THREE.Vector3(-34.5, 0.2, -4),
          scale: 4,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
        },
        {
          type: 'glb',
          filename: 'campfire_stones.glb',
          position: new THREE.Vector3(-34.4, 0.13, -3.9),
          scale: 4.8,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(100), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 2, height: 0.1, depth: 2 }, offset: new THREE.Vector3(-0.2, 0, -0.1) },
          ],
        },
        {
          type: 'glb',
          filename: 'stump_roundDetailed.glb',
          position: new THREE.Vector3(-35, 0.13, 3.5),
          scale: 4.8,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 1.5, height: 1, depth: 1.5 }, offset: new THREE.Vector3(0, 0, 0) },
          ],
        },
        {
          type: 'glb',
          filename: 'log.glb',
          position: new THREE.Vector3(-30, 0.13, 6),
          scale: 6,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-20), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 1.5, height: 0.7, depth: 4 }, offset: new THREE.Vector3(0, 0, 0) },
          ],
        },
        {
          type: 'glb',
          filename: 'log_stackLarge.glb',
          position: new THREE.Vector3(-34, 0.13, 11),
          scale: 5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 3.5, height: 1.5, depth: 2 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 3.5, height: 0.7, depth: 3 }, offset: new THREE.Vector3(0, 0, 0) },
          ],
        },
        {
          type: 'glb',
          filename: 'sign.glb',
          position: new THREE.Vector3(-29, 0.13, 11),
          scale: 5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(40), 0),
        },
        {
          type: 'glb',
          filename: 'flower_redC.glb',
          position: new THREE.Vector3(-35, 0.13, 5.5),
          scale: 2,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(40), 0),
        },
        {
          type: 'glb',
          filename: 'flower_yellowC.glb',
          position: new THREE.Vector3(-35, 0.13, 6.5),
          scale: 2,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(40), 0),
        },
        {
          type: 'glb',
          filename: 'flower_purpleC.glb',
          position: new THREE.Vector3(-35, 0.13, 7.5),
          scale: 2,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(40), 0),
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(20, 0.01, 38.8),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 8, height: 2, depth: 0.2 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(38.8, 0.01, 20.2),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 0.2, height: 2, depth: 8 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(38.8, 0.01, -20.2),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 0.2, height: 2, depth: 8 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(-20, 0.01, 38.8),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 8, height: 2, depth: 0.2 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(-38.8, 0.01, 20.2),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 0.2, height: 2, depth: 8 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(-38.8, 0.01, -20.2),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 0.2, height: 2, depth: 8 },
        },
        {
          type: 'glb',
          filename: 'Wood_Road_Block_Large_003.glb',
          position: new THREE.Vector3(-20, 0.01, -38.8),
          scale: 0.3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 8, height: 2, depth: 0.2 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(5, 0, 0),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(-5, 0, 0),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(5, 0, 7),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(-5, 0, 7),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(5, 0, -7),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(-5, 0, -7),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 0.9, depth: 3 },
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, 4),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, 6),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, 8),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, -4),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, -6),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(11.5, 0, -8),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, 4),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, 6),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, 8),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, -4),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, -6),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'bush1.glb',
          position: new THREE.Vector3(-11.5, 0, -8),
          scale: 0.7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
        },
        {
          type: 'glb',
          filename: 'tree2.glb',
          position: new THREE.Vector3(5, 0, -11),
          scale: 1,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 5, depth: 1 },
        },
        {
          type: 'glb',
          filename: 'slide.glb',
          position: new THREE.Vector3(9, 0, 35),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 8, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-1, 0, 0) },
            { size: { width: 7.4, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-1, 0.4, 0) },
            { size: { width: 6.8, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-1, 0.8, 0) },
            { size: { width: 6.2, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-1, 1.2, 0) },
            { size: { width: 5.8, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-0.7, 1.6, 0) },
            { size: { width: 4.4, height: 0.4, depth: 2 }, offset: new THREE.Vector3(-0.4, 2, 0) },
            { size: { width: 3, height: 0.4, depth: 2 }, offset: new THREE.Vector3(0, 2.4, 0) },
            { size: { width: 1.4, height: 0.4, depth: 2 }, offset: new THREE.Vector3(0.4, 2.8, 0) },
          ],
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(9, 0, 30),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 3, height: 0.9, depth: 1 },
        },
        {
          type: 'glb',
          filename: 'bench.glb',
          position: new THREE.Vector3(5.5, 0, 30),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 3, height: 0.9, depth: 1 },
        },
        {
          type: 'glb',
          filename: 'tree3.glb',
          position: new THREE.Vector3(11, 0, 29),
          scale: 0.9,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(70), 0),
        },
        {
          type: 'glb',
          filename: 'swing.glb',
          position: new THREE.Vector3(-10, 0, 32.2),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(180), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1, depth: 1 },
        },
        {
          type: 'glb',
          filename: 'swing.glb',
          position: new THREE.Vector3(-6, 0, 32.2),
          scale: 1.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(180), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1, depth: 1 },
        },
        {
          type: 'glb',
          filename: 'fence_corner.glb',
          position: new THREE.Vector3(-11, 0, 28.8),
          scale: 3.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.5, height: 1, depth: 3.2 }, offset: new THREE.Vector3(-1.5, 0, 0) },
            { size: { width: 3.2, height: 1, depth: 0.5 }, offset: new THREE.Vector3(0, 0, -1.5) },
          ],
        },
        {
          type: 'glb',
          filename: 'fence_corner.glb',
          position: new THREE.Vector3(-11, 0, 35.5),
          scale: 3.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(180), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.5, height: 1, depth: 3.2 }, offset: new THREE.Vector3(-1.5, 0, 0) },
            { size: { width: 3.2, height: 1, depth: 0.5 }, offset: new THREE.Vector3(0, 0, 1.5) },
          ],
        },
        {
          type: 'glb',
          filename: 'fence_corner.glb',
          position: new THREE.Vector3(-4.5, 0, 28.8),
          scale: 3.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.5, height: 1, depth: 3.2 }, offset: new THREE.Vector3(1.5, 0, 0) },
            { size: { width: 3.2, height: 1, depth: 0.5 }, offset: new THREE.Vector3(0, 0, -1.5) },
          ],
        },
        {
          type: 'glb',
          filename: 'fence_corner.glb',
          position: new THREE.Vector3(-4.5, 0, 35.5),
          scale: 3.5,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(-90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.5, height: 1, depth: 3.2 }, offset: new THREE.Vector3(1.5, 0, 0) },
            { size: { width: 3.2, height: 1, depth: 0.5 }, offset: new THREE.Vector3(0, 0, 1.5) },
          ],
        },
        {
          type: 'car',
          filename: 'suv.glb',
          position: new THREE.Vector3(3, 0, -34),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 2.7, depth: 7 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4, height: 1.3, depth: 5 }, offset: new THREE.Vector3(0, 2.7, -1) },
          ],
        },
        {
          type: 'car',
          filename: 'sedan.glb',
          position: new THREE.Vector3(-4, 0, -34),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 2.5, depth: 7 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4, height: 1.3, depth: 4 }, offset: new THREE.Vector3(0, 2.5, 0) },
          ],
        },
        {
          type: 'car',
          filename: 'ambulance.glb',
          position: new THREE.Vector3(10, 0, -33),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 2.7, depth: 9 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4, height: 1.3, depth: 7 }, offset: new THREE.Vector3(0, 2.7, -1) },
            { size: { width: 4, height: 1, depth: 6 }, offset: new THREE.Vector3(0, 4, -1.5) },
          ],
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(27.5, 0, -13),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(27.5, 0, 13),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(37, 0, -13),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(37, 0, 13),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(27.5, 0, -4),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'cone.glb',
          position: new THREE.Vector3(27.5, 0, 4),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxSize: { width: 1, height: 1.8, depth: 1 },
        },
        {
          type: 'car',
          filename: 'tractor-shovel.glb',
          position: new THREE.Vector3(33, 0, 2),
          scale: 3,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(0), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 2.2, depth: 7 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4, height: 2.5, depth: 3 }, offset: new THREE.Vector3(0, 2.2, -1.8) },
          ],
        },
        {
          type: 'glb',
          filename: 'log_stackLarge.glb',
          position: new THREE.Vector3(33, 0.13, 9),
          scale: 7,
          rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(90), 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4.8, height: 1, depth: 4 }, offset: new THREE.Vector3(0, 0, 0) },
            { size: { width: 4.8, height: 1, depth: 2.8 }, offset: new THREE.Vector3(0, 1, 0) },
          ],
        },
      ];

      // Fence A: X축으로
      const fenceStartXA = -10.5;
      const fenceCountA = 14;
      const fenceSpacingA = 3.7;
      const fenceZ_A = -37.7;

      for (let i = 0; i < fenceCountA; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceStartXA + i * fenceSpacingA, 0, fenceZ_A),
          scale: 4.0,
          rotation: new THREE.Euler(0, 0, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 1.2, depth: 0.2 }, offset: new THREE.Vector3(0, 0, -1.8) },
          ],
        });
      }

      // Fence B: Z축으로 수직 설치 (회전 포함)
      const fenceStartXB = -6.7;
      const fenceStartZB = -37.7;
      const fenceCountB = 3;
      const fenceSpacingB = 3.7;
      const fenceX_B = fenceStartXB + (fenceCountA - 1) * fenceSpacingA;

      for (let i = 0; i < fenceCountB; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_B, 0, fenceStartZB + i * fenceSpacingB),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence C: Z축으로 수직 설치 (회전 포함)
      const fenceStartXC = 34;
      const fenceStartZC = -11;
      const fenceCountC = 7;
      const fenceSpacingC = 3.7;
      const fenceX_C = fenceStartXC + (fenceCountB - 1) * fenceSpacingC;

      for (let i = 0; i < fenceCountC; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_C, 0, fenceStartZC + i * fenceSpacingC),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence D: Z축으로 수직 설치 (회전 포함)
      const fenceStartXD = 19.2;
      const fenceStartZD = 30.3;
      const fenceCountD = 3;
      const fenceSpacingD = 3.7;
      const fenceX_D = fenceStartXD + (fenceCountC - 1) * fenceSpacingD;

      for (let i = 0; i < fenceCountD; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_D, 0, fenceStartZD + i * fenceSpacingD),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence E: X축으로
      const fenceStartXE = 30;
      const fenceCountE = 3;
      const fenceSpacingE = 3.7;
      const fenceZ_E = 41.42;

      for (let i = 0; i < fenceCountE; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceStartXE + i * fenceSpacingE, 0, fenceZ_E),
          scale: 4.0,
          rotation: new THREE.Euler(0, 0, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 1.2, depth: 0.2 }, offset: new THREE.Vector3(0, 0, -1.8) },
          ],
        });
      }

      // Fence F: X축으로
      const fenceStartXF = -11;
      const fenceCountF = 7;
      const fenceSpacingF = 3.7;
      const fenceZ_F = 41.42;

      for (let i = 0; i < fenceCountF; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceStartXF + i * fenceSpacingF, 0, fenceZ_F),
          scale: 4.0,
          rotation: new THREE.Euler(0, 0, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 1.2, depth: 0.2 }, offset: new THREE.Vector3(0, 0, -1.8) },
          ],
        });
      }

      // Fence G: X축으로
      const fenceStartXG = -37.5;
      const fenceCountG = 3;
      const fenceSpacingG = 3.7;
      const fenceZ_G = 41.42;

      for (let i = 0; i < fenceCountG; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceStartXG + i * fenceSpacingG, 0, fenceZ_G),
          scale: 4.0,
          rotation: new THREE.Euler(0, 0, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 1.2, depth: 0.2 }, offset: new THREE.Vector3(0, 0, -1.8) },
          ],
        });
      }

      // Fence H: Z축으로 수직 설치 (회전 포함)
      const fenceStartXH = -45;
      const fenceStartZH = 30.3;
      const fenceCountH = 3;
      const fenceSpacingH = 3.7;
      const fenceX_H = fenceStartXH + (fenceCountG - 1) * fenceSpacingH;

      for (let i = 0; i < fenceCountH; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_H, 0, fenceStartZH + i * fenceSpacingH),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence I: Z축으로 수직 설치 (회전 포함)
      const fenceStartXI = -45;
      const fenceStartZI = -11;
      const fenceCountI = 7;
      const fenceSpacingI = 3.7;
      const fenceX_I = fenceStartXI + (fenceCountH - 1) * fenceSpacingI;

      for (let i = 0; i < fenceCountI; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_I, 0, fenceStartZI + i * fenceSpacingI),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence J: Z축으로 수직 설치 (회전 포함)
      const fenceStartXJ = -60;
      const fenceStartZJ = -37.7;
      const fenceCountJ = 3;
      const fenceSpacingJ = 3.7;
      const fenceX_J = fenceStartXJ + (fenceCountI - 1) * fenceSpacingJ;

      for (let i = 0; i < fenceCountJ; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceX_J, 0, fenceStartZJ + i * fenceSpacingJ),
          scale: 4.0,
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 0.2, height: 1.2, depth: 4 }, offset: new THREE.Vector3(-1.8, 0, 0) },
          ],
        });
      }

      // Fence K: X축으로
      const fenceStartXK = -37.9;
      const fenceCountK = 3;
      const fenceSpacingK = 3.7;
      const fenceZ_K = -37.7;

      for (let i = 0; i < fenceCountK; i++) {
        modelsToLoad.push({
          type: 'glb',
          filename: 'fence_simple.glb',
          position: new THREE.Vector3(fenceStartXK + i * fenceSpacingK, 0, fenceZ_K),
          scale: 4.0,
          rotation: new THREE.Euler(0, 0, 0),
          collidable: true,
          boundingBoxes: [
            { size: { width: 4, height: 1.2, depth: 0.2 }, offset: new THREE.Vector3(0, 0, -1.8) },
          ],
        });
      }

      const flowerModels = [
        'flower-white.glb',
        'flower-red.glb',
        'flower-blue.glb',
      ];
      const flowerCountPerType = 10;
      const flowerSpawnArea = {
        xMin: -10,
        xMax: 10,
        zMin: -11,
        zMax: 11,
        y: 0,
      };
      flowerModels.forEach((filename) => {
        for (let i = 0; i < flowerCountPerType; i++) {
          const randomX = Math.random() * (flowerSpawnArea.xMax - flowerSpawnArea.xMin) + flowerSpawnArea.xMin;
          const randomZ = Math.random() * (flowerSpawnArea.zMax - flowerSpawnArea.zMin) + flowerSpawnArea.zMin;

          if (randomX >= -4 && randomX <= 4) continue;

          modelsToLoad.push({
            type: 'glb',
            filename,
            position: new THREE.Vector3(randomX, flowerSpawnArea.y, randomZ),
            scale: 1.5,
            rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(Math.random() * 360), 0),
          });
        }
      });

      modelsToLoad.forEach((modelInfo) => {
        if (modelInfo.type === 'fbx') {
          fbxLoader.load(modelInfo.filename, (fbx) => {
            this.OnModelLoaded_(fbx, modelInfo, textureLoader);
          });
        } else if (modelInfo.type === 'glb') {
          gltfLoader.load(modelInfo.filename, (gltf) => {
            this.OnModelLoaded_(gltf.scene, modelInfo, textureLoader);
          });
        } else if (modelInfo.type === 'car') {
          carLoader.load(modelInfo.filename, (gltf) => {
            this.OnModelLoaded_(gltf.scene, modelInfo, textureLoader);
          });
        } else if (modelInfo.type === 'character') {
          characterLoader.load(modelInfo.filename, (gltf) => {
            this.OnModelLoaded_(gltf.scene, modelInfo, textureLoader);
          });
        } else if (modelInfo.type === 'character') {
          characterLoader.load(gltf.scene, modelInfo, textureLoader);
          });
        }
      });
    }

    OnModelLoaded_(model, modelInfo, textureLoader) {
      model.scale.setScalar(modelInfo.scale);
      model.position.copy(modelInfo.position);
      if (modelInfo.rotation) {
        model.rotation.copy(modelInfo.rotation);
      }

      if (modelInfo.texture) {
        const texture = textureLoader.load(
          `./resources/Buildings-pack-Aug-2017/Textures/${modelInfo.texture}`
        );
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            c.material = new THREE.MeshStandardMaterial({ map: texture });
          }
        });
      } else {
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
      }

      this.scene_.add(model);
      this.models_.push(model);

      if (modelInfo.collidable) {
        if (modelInfo.boundingBoxes) {
          // 다중 바운딩 박스 처리 (House2.fbx)
          modelInfo.boundingBoxes.forEach((boxInfo) => {
            const { width, height, depth } = boxInfo.size;
            const halfWidth = width / 2;
            const halfHeight = height;
            const halfDepth = depth / 2;
            const boxPosition = modelInfo.position.clone().add(boxInfo.offset);
            const boundingBox = new THREE.Box3(
              new THREE.Vector3(-halfWidth, 0, -halfDepth).add(boxPosition),
              new THREE.Vector3(halfWidth, halfHeight, halfDepth).add(boxPosition)
            );
            const collidable = { model, boundingBox, offset: boxInfo.offset };
            this.collidables_.push(collidable);
            const helper = new THREE.Box3Helper(boundingBox, 0x00ff00);
            helper.visible = false;
            this.scene_.add(helper);
            this.debugHelpers_.push(helper);
          });
        } else if (modelInfo.boundingBoxSize) {
          // 단일 바운딩 박스 처리 (기존 로직)
          const { width, height, depth } = modelInfo.boundingBoxSize;
          const halfWidth = width / 2;
          const halfHeight = height;
          const halfDepth = depth / 2;
          const boundingBox = new THREE.Box3(
            new THREE.Vector3(-halfWidth, 0, -halfDepth).add(modelInfo.position),
            new THREE.Vector3(halfWidth, halfHeight, halfDepth).add(modelInfo.position)
          );
          const collidable = { model, boundingBox, offset: new THREE.Vector3(0, 0, 0) };
          this.collidables_.push(collidable);
          const helper = new THREE.Box3Helper(boundingBox, 0x00ff00);
          helper.visible = false;
          this.scene_.add(helper);
          this.debugHelpers_.push(helper);
        }
      }
    }

    Update(timeElapsed) {
      this.collidables_.forEach((collidable) => {
        if (collidable.model.userData.boundingBoxSize) {
          // 단일 바운딩 박스 업데이트
          const { width, height, depth } = collidable.model.userData.boundingBoxSize;
          const halfWidth = width / 2;
          const halfHeight = height;
          const halfDepth = depth / 2;
          const boxPosition = collidable.model.position.clone().add(collidable.offset);
          collidable.boundingBox.set(
            new THREE.Vector3(-halfWidth, 0, -halfDepth).add(boxPosition),
            new THREE.Vector3(halfWidth, halfHeight, halfDepth).add(boxPosition)
          );
        } else if (collidable.offset) {
          // 다중 바운딩 박스 업데이트 (House2.fbx)
          const boxInfo = collidable.model.userData.boundingBoxes?.find(
            (box) => box.offset.equals(collidable.offset)
          );
          if (boxInfo) {
            const { width, height, depth } = boxInfo.size;
            const halfWidth = width / 2;
            const halfHeight = height;
            const halfDepth = depth / 2;
            const boxPosition = collidable.model.position.clone().add(collidable.offset);
            collidable.boundingBox.set(
              new THREE.Vector3(-halfWidth, 0, -halfDepth).add(boxPosition),
              new THREE.Vector3(halfWidth, halfHeight, halfDepth).add(boxPosition)
            );
          }
        } else {
          // 기본 바운딩 박스
          collidable.boundingBox.setFromObject(collidable.model);
        }
      });
    }

    ToggleDebugVisuals(visible) {
      this.debugHelpers_.forEach((helper) => {
        helper.visible = visible;
      });
    }

    GetCollidables() {
      return this.collidables_;
    }
  }

  // 통합된 인터페이스 반환
  return {
    NPC,
    NatureObject,
  };
})();