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

  // NatureObject 클래스 - kkc-game-main 버전에서 가져온 환경 오브젝트 기능
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
        // 추가 모델 로드 코드 (간략화)
      ];

      // 모델 로드 로직 구현
      for (const model of modelsToLoad) {
        this.LoadModel_(model, fbxLoader, gltfLoader, carLoader, textureLoader);
      }
    }

    LoadModel_(modelData, fbxLoader, gltfLoader, carLoader, textureLoader) {
      let loader;
      
      switch (modelData.type) {
        case 'fbx':
          loader = fbxLoader;
          break;
        case 'glb':
          loader = gltfLoader;
          break;
        case 'car':
          loader = carLoader;
          break;
        default:
          console.error('Unknown model type:', modelData.type);
          return;
      }
      
      loader.load(modelData.filename, (object) => {
        // 모델 설정 로직
        object.position.copy(modelData.position);
        object.scale.setScalar(modelData.scale);
        object.rotation.copy(modelData.rotation);
        
        // 텍스처 적용 (필요한 경우)
        if (modelData.texture) {
          const texture = textureLoader.load(`./resources/Buildings-pack-Aug-2017/Textures/${modelData.texture}`);
          object.traverse((child) => {
            if (child.isMesh) {
              child.material.map = texture;
            }
          });
        }
        
        // 그림자 설정
        object.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        this.scene_.add(object);
        this.models_.push(object);
        
        // 충돌 박스 생성 (필요한 경우)
        if (modelData.collidable) {
          this.CreateColliders_(object, modelData);
        }
      });
    }

    CreateColliders_(object, modelData) {
      // 단일 바운딩 박스
      if (modelData.boundingBoxSize) {
        const size = modelData.boundingBoxSize;
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
          new THREE.Vector3(
            object.position.x,
            object.position.y + size.height / 2,
            object.position.z
          ),
          new THREE.Vector3(size.width, size.height, size.depth)
        );
        
        this.collidables_.push(box);
        
        // 디버그 헬퍼 추가 (필요한 경우)
        if (window.DEBUG_MODE_HITBOXES) {
          const helper = new THREE.Box3Helper(box, 0xff0000);
          this.scene_.add(helper);
          this.debugHelpers_.push(helper);
        }
      }
      
      // 다중 바운딩 박스
      if (modelData.boundingBoxes) {
        for (const boxData of modelData.boundingBoxes) {
          const size = boxData.size;
          const offset = boxData.offset || new THREE.Vector3(0, 0, 0);
          
          const box = new THREE.Box3();
          box.setFromCenterAndSize(
            new THREE.Vector3(
              object.position.x + offset.x,
              object.position.y + offset.y + size.height / 2,
              object.position.z + offset.z
            ),
            new THREE.Vector3(size.width, size.height, size.depth)
          );
          
          this.collidables_.push(box);
          
          // 디버그 헬퍼 추가 (필요한 경우)
          if (window.DEBUG_MODE_HITBOXES) {
            const helper = new THREE.Box3Helper(box, 0xff0000);
            this.scene_.add(helper);
            this.debugHelpers_.push(helper);
          }
        }
      }
    }

    GetCollidables() {
      return this.collidables_;
    }
    
    SetDebugHelpersVisible(visible) {
      for (const helper of this.debugHelpers_) {
        helper.visible = visible;
      }
    }
  }

  // 통합된 인터페이스 반환
  return {
    NPC,
    NatureObject,
  };
})();