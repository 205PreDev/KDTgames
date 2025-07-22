// player.js - Integrated multiplayer version with advanced features
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { Item } from './item.js';
import * as map from './map.js';
import { WEAPON_DATA, WeaponFactory, WeaponManager, ATTACK_TYPE_MELEE, ATTACK_TYPE_RANGED } from './weapon_system.js';
import { AttackSystem } from './attackSystem.js';
import { createMuzzleFlashEffect } from './effects.js';

// === 무기 회전 테이블 및 함수 추가 (파일 상단 import 아래에 위치) ===
const weaponRotationTable = {
  SwordSlash: [
    { start: 11, end: 21, getRotation: (frame) => [
      (frame - 11) / 10 * (Math.PI / 2), Math.PI / 2, 0
    ]},
    { start: 22, end: 22, getRotation: () => [Math.PI / 3, Math.PI / 2, 0]},
    { start: 23, end: 23, getRotation: () => [Math.PI / 6, Math.PI / 2, 0]},
    { start: 24, end: 24, getRotation: () => [0, Math.PI / 2, 0]},
    { start: 0, end: 999, getRotation: () => [Math.PI / 2, Math.PI / 2, 0]},
  ],
  Shoot_OneHanded: [
    { start: 0, end: 999, getRotation: () => [Math.PI / 2, Math.PI / 2, 0]},
  ],
  Idle: [
    { start: 0, end: 999, getRotation: () => [Math.PI / 2, Math.PI / 2, 0]},
  ],
  Walk: [
    { start: 0, end: 999, getRotation: () => [Math.PI / 2, Math.PI / 2, 0]},
  ],
  Run: [
    { start: 0, end: 999, getRotation: () => [Math.PI / 2, Math.PI / 2, 0]},
  ],
  // 필요시 다른 애니메이션 추가
};

function getWeaponRotation(animationName, frame, equippedWeapon) {
  const table = weaponRotationTable[animationName];
  if (!table) return [Math.PI / 2, Math.PI / 2, 0]; // 기본값
  for (const entry of table) {
    if (frame >= entry.start && frame <= entry.end) {
      return entry.getRotation(frame);
    }
  }
  return [Math.PI / 2, Math.PI / 2, 0];
}
export const player = (() => {

  class Player {
    constructor(params) {
      // 기본 속성 초기화
      this.position_ = new THREE.Vector3(0, 0, 0);
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.speed_ = 5;
      this.params_ = params;
      this.mesh_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.currentAnimationName_ = 'Idle';
      
      // 네트워크 관련 속성
      this.isRemote = params.isRemote || false;
      this.socket = params.socket || null;
      this.roomId = params.roomId || null;
      
      // HP 시스템
      this.hp_ = 100;
      this.maxHp_ = 100;
      this.isDead_ = false;
      this.respawnDelay_ = 3; // 리스폰 딜레이 (초)
      this.respawnTimer_ = 0; // 리스폰 타이머
      this.hpUI = params.hpUI || null;
      
      // 키 입력 상태
      this.keys_ = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        e_key: false,
        ctrl_key: false,
        j_key: false, // J 키 상태 추가
      };
      
      // 고급 시스템 속성
      this.inventory_ = [];
      this.equippedWeapon_ = null;
      this.weaponManager_ = new WeaponManager(); // 새로운 무기 시스템 매니저
      this.attackSystem = new AttackSystem(params.scene || (params && params.scene));
      this.soundManager_ = params.soundManager; // SoundManager 인스턴스 추가
      
      // 물리 및 이동 관련 속성
      this.jumpPower_ = 12;
      this.gravity_ = -30;
      this.isJumping_ = false;
      this.velocityY_ = 0;
      this.jumpSpeed_ = 0.5;
      this.isRolling_ = false;
      this.rollDuration_ = 0.5;
      this.rollTimer_ = 0;
      this.rollSpeed_ = 18;
      this.rollDirection_ = new THREE.Vector3(0, 0, 0);
      this.rollCooldown_ = 1.0;
      this.rollCooldownTimer_ = 0;
      
      // 공격 관련 속성
      this.attackCooldown_ = 0.5; // 쿨타임 설정 (예: 0.5초)
      this.attackCooldownTimer_ = 0; // 현재 쿨타임 타이머
      this.attackTimer_ = 0; // Attack 타이머
      this.attackDuration_ = 0.5; // 공격 애니메이션 지속 시간 (초)
      this.attackSpeed_ = 18; // Attack 이동 속도
      this.attackDirection_ = new THREE.Vector3(0, 0, 0); // Attack 방향
      this.isAttacking_ = false; // 공격 중인지 여부
      this.isAerialAttacking_ = false; // 공중 공격 중인지 여부
      this.hasSpawnedCurrentAerialHitbox_ = false; // 공중 공격 히트박스 생성 여부
      this.canDamage_ = false; // 피해를 줄 수 있는 상태인지 여부
      this.attackedThisFrame_ = false; // 한 프레임에 여러 번 공격하는 것을 방지
      this.hitEnemies_ = new Set(); // 현재 공격으로 피해를 입은 적들을 추적
      this.currentAttackRadius = 1.5; // 기본 맨손 공격 반경
      this.currentAttackAngle = Math.PI / 2; // 기본 맨손 공격 각도 (90 degrees)
      this.currentAttackDamage = 0;
      
      // 피격 시스템 추가
      this.isHit_ = false; // 피격 상태
      this.hitTimer_ = 0; // 피격 타이머
      this.hitDuration_ = 0.5; // 피격 지속 시간
      
      // 디버그 관련 속성
      this.debugHitboxMesh_ = null;
      this.debugHitboxVisible_ = false;
      this.hitboxRadius_ = 0.7;
      this.hitboxHeight_ = 1.8;
      this.boundingBox_ = new THREE.Box3();
      this.boundingBoxHelper_ = null;
      
      // Player Stats
      this.strength_ = 0;
      this.agility_ = 0;
      this.stamina_ = 0;
      
      // 초기화 함수 호출
      this.LoadModel_(params.character || 'Knight_Male');
      this.UpdateDerivedStats(); // Initial stat calculation
      
      if (!this.isRemote) {
        this.InitInput_();
      }
    }    
    UpdateDerivedStats() {
      this.maxHp_ = 100 * (1 + (this.stamina_ * 0.1));
      const baseDamage = this.equippedWeapon_ ? this.equippedWeapon_.damage : 10; // 10 is bare-hand damage
      this.currentAttackDamage = baseDamage + this.strength_ * 5; // Strength increases damage
      this.speed_ = 5 * (1 + (this.agility_ * 0.1));
      this.attackCooldown_ = (this.equippedWeapon_ ? (0.5 / this.equippedWeapon_.attackSpeedMultiplier) : 0.5) * (1 - (this.agility_ * 0.1));
    }

    InitInput_() {
      window.addEventListener('keydown', (e) => this.OnKeyDown_(e), false);
      window.addEventListener('keyup', (e) => this.OnKeyUp_(e), false);
    }

    DisableInput_() {
      window.removeEventListener('keydown', (e) => this.OnKeyDown_(e), false);
      window.removeEventListener('keyup', (e) => this.OnKeyUp_(e), false);
      // 모든 키 상태 초기화
      this.keys_ = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        e_key: false,
        ctrl_key: false,
        j_key: false,
      };
    }

    canTakeDamage() {
      // 플레이어가 죽었거나 피격 중이 아니면 피해를 받을 수 있음
      return !this.isDead_ && !this.isHit_;
    }

    TakeDamage(amount) {
      try {
        if (!this.canTakeDamage()) return; // 피해를 받을 수 없는 상태면 무시
      
        this.hp_ -= amount;
        if (this.hp_ <= 0) {
          this.hp_ = 0;
          if (this.hpUI && typeof this.hpUI.forceDeath === 'function') {
            this.hpUI.forceDeath();
          }
          this.isDead_ = true;
          this.respawnTimer_ = this.respawnDelay_;
          this.SetAnimation_('Death');
          
          if (!this.isRemote) {
            this.DisableInput_(); // 키 입력 비활성화
          }
        } else {
          // 피격 상태 설정
          this.isHit_ = true;
          this.hitTimer_ = this.hitDuration_;
          this.SetAnimation_('receievehit'); // 피해를 입었을 때 ReceiveHit 애니메이션 호출
          if (this.soundManager_) {
            this.soundManager_.playSound('hit_impact');
          }
          
          // 피격 효과 (로컬 플레이어에게만 적용)
          if (!this.isRemote && this.params_.hitEffect) {
            this.params_.hitEffect.style.opacity = '1';
            setTimeout(() => {
              this.params_.hitEffect.style.opacity = '0';
            }, 100); // 0.1초 동안 표시
          }
        }
        
        // HP UI 업데이트
        if (this.hpUI) {
          this.hpUI.updateHP(this.hp_);
        }
        
        // 네트워크 동기화 - 피격 상태 전송
        this.SyncNetworkState();
      } catch (err) {
        console.error('[TakeDamage] 데미지 처리 오류:', err);
        alert('네트워크 오류로 데미지 동기화에 실패했습니다.');
      }
    }  
  Revive() {
      this.Respawn_();
    }

    Respawn_() {
      this.hp_ = this.maxHp_;
      this.isDead_ = false;
      this.respawnTimer_ = 0;
      
      // 리스폰 위치 설정
      if (this.params_.getRespawnPosition) {
        const respawnPosition = this.params_.getRespawnPosition();
        this.SetPosition([respawnPosition.x, respawnPosition.y, respawnPosition.z]);
      } else if (map && map.RESPAWN_POSITION) {
        this.position_.copy(map.RESPAWN_POSITION);
      } else {
        // 랜덤 위치 생성
        let minX = 0, maxX = 0, minZ = 0, maxZ = 0, minY = 0;
        if (map && map.MAP_BOUNDS) {
          minX = map.MAP_BOUNDS.minX;
          maxX = map.MAP_BOUNDS.maxX;
          minZ = map.MAP_BOUNDS.minZ;
          maxZ = map.MAP_BOUNDS.maxZ;
          minY = map.MAP_BOUNDS.minY;
        }
        const randomX = Math.random() * (maxX - minX) + minX;
        const randomZ = Math.random() * (maxZ - minZ) + minZ;
        this.position_.set(randomX, minY + 10, randomZ);
      }
      
      // 상태 초기화
      this.velocity_.set(0, 0, 0);
      this.velocityY_ = 0;
      this.isJumping_ = false;
      this.isRolling_ = false;
      this.rollCooldownTimer_ = 0;
      this.isHit_ = false;
      this.hitTimer_ = 0;
      
      // 애니메이션 설정
      this.SetAnimation_('Idle');
      
      // 입력 활성화 (로컬 플레이어만)
      if (!this.isRemote) {
        this.InitInput_();
      }
      
      // HP UI 업데이트
      if (this.hpUI) {
        this.hpUI.updateHP(this.hp_);
      }
      
      // 네트워크 동기화
      this.SyncNetworkState();
    }

    increaseStat(statName, amount) {
      switch (statName) {
        case 'strength':
          this.strength_ += amount;
          break;
        case 'agility':
          this.agility_ += amount;
          break;
        case 'stamina':
          this.stamina_ += amount;
          break;
        default:
          console.warn(`Unknown stat: ${statName}`);
      }
      this.UpdateDerivedStats();
    }

    OnKeyDown_(event) {
      if (this.isDead_ || this.isHit_) return; // 죽었거나 피격 중이면 입력 무시
      
      switch (event.code) {
        case 'KeyW': this.keys_.forward = true; break;
        case 'KeyS': this.keys_.backward = true; break;
        case 'KeyA': this.keys_.left = true; break;
        case 'KeyD': this.keys_.right = true; break;
        case 'KeyE': this.keys_.e_key = true; this.PickupWeapon_(); break;
        case 'ControlLeft':
        case 'ControlRight':
          this.keys_.ctrl_key = true; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys_.shift = true; break;   
     case 'KeyK':
          if (this.isAttacking_ || this.isHit_) return; // 공격 중이거나 피격 중에는 점프 불가
          if (!this.isJumping_ && !this.isRolling_) {
            this.isJumping_ = true;
            this.velocityY_ = this.jumpPower_;
            this.SetAnimation_('Jump');
            if (this.soundManager_) {
              this.soundManager_.playSound('jump_sound');
            }
            // 네트워크 동기화 - 점프 상태 전송
            this.SyncNetworkState();
          }
          break;
        case 'KeyJ':
          this.keys_.j_key = true; // J 키 눌림 상태 업데이트
          
          if (this.isHit_) return; // 피격 중에는 공격 불가
          if (this.isAttacking_) return; // 이미 공격 중이면 새로운 공격 시작 불가
          if (this.attackCooldownTimer_ > 0) return; // 쿨다운 중이면 공격 불가

          // 공중 상태에서의 공격 (공중 공격)
          if (this.isJumping_ && !this.isAerialAttacking_) {
            this.isAerialAttacking_ = true;
            this.isAttacking_ = true;
            this.attackTimer_ = this.attackDuration_;
            this.hasSpawnedCurrentAerialHitbox_ = false; // 히트박스 생성 여부 초기화
            const moveDir = new THREE.Vector3();
            this.mesh_.getWorldDirection(moveDir);
            moveDir.y = 0;
            moveDir.normalize();
            this.attackDirection_.copy(moveDir);
            // 무기 타입에 따라 애니메이션 분기
            const isRangedWeapon = this.equippedWeapon_ && this.equippedWeapon_.type === 'ranged';
            const aerialAttackAnimation = isRangedWeapon ? 'Shoot_OneHanded' : 'SwordSlash';
            this.SetAnimation_(aerialAttackAnimation);
            this.hitEnemies_.clear();
            this.attackCooldownTimer_ = this.attackCooldown_;
            this.animations_[aerialAttackAnimation].setLoop(THREE.LoopOnce);
            this.animations_[aerialAttackAnimation].clampWhenFinished = true;
            this.animations_[aerialAttackAnimation].reset();
            
            // 네트워크 동기화 - 공격 상태 전송
            this.SyncNetworkState();
            return;
          }
          
          // 기존 지상 공격 로직
          // 원거리 무기인지 확인
          const isRangedWeapon = this.equippedWeapon_ && this.equippedWeapon_.type === 'ranged';
          const attackAnimation = isRangedWeapon ? 'Shoot_OneHanded' : 'SwordSlash';
          
          if (
            !this.isJumping_ &&
            !this.isRolling_ &&
            this.animations_[attackAnimation] && // 무기 타입에 따른 애니메이션 확인
            this.attackCooldownTimer_ <= 0
          ) {
            this.isAttacking_ = true;
            this.attackTimer_ = this.attackDuration_;
            const moveDir = new THREE.Vector3();
            this.mesh_.getWorldDirection(moveDir); // 플레이어가 바라보는 방향을 가져옴
            moveDir.y = 0; // Y축 방향은 무시
            moveDir.normalize(); // 정규화
            this.attackDirection_.copy(moveDir);
            this.SetAnimation_(attackAnimation); // 무기 타입에 따른 애니메이션 사용
            this.hitEnemies_.clear(); // 새로운 공격 시작 시 hitEnemies 초기화
            this.attackCooldownTimer_ = this.attackCooldown_;

            // 공격 애니메이션 반복 설정
            this.animations_[attackAnimation].setLoop(THREE.LoopOnce); // LoopOnce로 변경
            this.animations_[attackAnimation].clampWhenFinished = true; // 애니메이션 종료 후 마지막 프레임 유지
            this.animations_[attackAnimation].reset(); // 애니메이션을 처음부터 다시 시작
            
            // 네트워크 동기화 - 공격 상태 전송
            this.SyncNetworkState();
          }
          break; 
       case 'KeyL':
          if (this.isAttacking_ || this.isHit_) return; // 공격 중이거나 피격 중에는 구르기 불가
          if (
            !this.isJumping_ &&
            !this.isRolling_ &&
            this.animations_['Roll'] &&
            this.rollCooldownTimer_ <= 0
          ) {
            this.isRolling_ = true;
            this.rollTimer_ = this.rollDuration_;
            const moveDir = new THREE.Vector3();
            if (this.keys_.forward) moveDir.z -= 1;
            if (this.keys_.backward) moveDir.z += 1;
            if (this.keys_.left) moveDir.x -= 1;
            if (this.keys_.right) moveDir.x += 1;
            if (moveDir.lengthSq() === 0) {
              this.mesh_.getWorldDirection(moveDir);
              moveDir.y = 0;
              moveDir.normalize();
            } else {
              moveDir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lastRotationAngle_ || 0);
            }
            this.rollDirection_.copy(moveDir);
            this.SetAnimation_('Roll');
            this.rollCooldownTimer_ = this.rollCooldown_;
            
            // 네트워크 동기화 - 구르기 상태 전송
            this.SyncNetworkState();
          }
          break;
      }
    }

    OnKeyUp_(event) {
      switch (event.code) {
        case 'KeyW': this.keys_.forward = false; break;
        case 'KeyS': this.keys_.backward = false; break;
        case 'KeyA': this.keys_.left = false; break;
        case 'KeyD': this.keys_.right = false; break;
        case 'KeyE': this.keys_.e_key = false; break;
        case 'ControlLeft':
        case 'ControlRight':
          this.keys_.ctrl_key = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys_.shift = false; break;
        case 'KeyJ':
          this.keys_.j_key = false; break;
      }
    }

    LoadModel_(characterName = 'Knight_Male') {
      try {
        if (!characterName || typeof characterName !== 'string') {
          console.warn('[LoadModel_] 잘못된 캐릭터 이름, Knight_Male로 fallback');
          characterName = 'Knight_Male';
        }
        const loader = new GLTFLoader();
        loader.setPath('./resources/Ultimate Animated Character Pack - Nov 2019/glTF/');
        loader.load(`${characterName}.gltf`, (gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(1);
          model.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
          this.mesh_ = model;
          this.params_.scene.add(model);

          model.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              
            }
            if (c.isBone && c.name === 'Head') {
              this.headBone = c;
            }
          }); 
         // 고정된 크기의 바운딩 박스 초기화
          const halfWidth = 0.65; // 너비: 1.0
          const halfHeight = 3.2; // 높이: 2.5
          const halfDepth = 0.65; // 깊이: 1.0
          this.boundingBox_.set(
            new THREE.Vector3(-halfWidth, 0, -halfDepth),
            new THREE.Vector3(halfWidth, halfHeight, halfDepth)
          );
          this.boundingBox_.translate(this.position_);
          this.boundingBoxHelper_ = new THREE.Box3Helper(this.boundingBox_, 0xff0000);
          this.boundingBoxHelper_.visible = false;
          this.params_.scene.add(this.boundingBoxHelper_);

          this.mixer_ = new THREE.AnimationMixer(model);

          this.mixer_.addEventListener('finished', (e) => {
            if (e.action.getClip().name === 'SwordSlash' || e.action.getClip().name === 'Shoot_OneHanded') {
              
              this.canDamage_ = false; // 공격 애니메이션 끝나면 초기화
              this.hitEnemies_.clear(); // 공격 종료 시 hitEnemies 초기화

              // 애니메이션이 끝났을 때, J 키가 눌려있지 않다면 isAttacking_을 false로 설정하고 이동/대기 애니메이션으로 전환
              // 자동 발사 무기 (fireMode === 'auto')가 아닌 경우에도 처리
              // 애니메이션이 끝났을 때, J 키가 눌려있다면 공격 애니메이션을 다시 시작
              if (this.keys_.j_key) {
                  this.attackCooldownTimer_ = this.attackCooldown_; // 쿨다운 재설정
                  this.currentAction_.reset(); // 현재 액션을 리셋
                  this.currentAction_.play(); // 다시 재생
                  
              } else {
                  // J 키가 떼어졌다면 isAttacking_을 false로 설정하고 이동/대기 애니메이션으로 전환
                  this.isAttacking_ = false;
                  const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
                  const isRunning = isMoving && this.keys_.shift;
                  if (isMoving) {
                      this.SetAnimation_(isRunning ? 'Run' : 'Walk');
                  } else {
                      this.SetAnimation_('Idle');
                  }
                  
              }
            } else if (e.action.getClip().name === 'receievehit') {
              // 피격 애니메이션이 끝나면 피격 상태 해제
              this.isHit_ = false;
              this.hitTimer_ = 0;
              // ReceiveHit 애니메이션이 끝나면 Idle 또는 Walk/Run 애니메이션으로 전환
              const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
              const isRunning = isMoving && this.keys_.shift;
              if (isMoving) {
                  this.SetAnimation_(isRunning ? 'Run' : 'Walk');
              } else {
                  this.SetAnimation_('Idle');
              }
            }
          });  
        for (const clip of gltf.animations) {
            this.animations_[clip.name] = this.mixer_.clipAction(clip);
          }
          
          this.SetAnimation_('Idle');
          
          // HPUI에 플레이어 mesh와 headBone 연결
          if (this.hpUI) {
            this.hpUI.setPlayerTarget(this.mesh_, this.headBone);
          }
          
          if (this.params_.onLoad) {
            this.params_.onLoad();
          }
        }, undefined, (error) => {
          console.error('glTF 로드 오류:', error, '기본 캐릭터로 fallback');
          if (characterName !== 'Knight_Male') {
            this.LoadModel_('Knight_Male');
          }
        });
      } catch (err) {
        console.error('[LoadModel_] 캐릭터 모델 로드 오류:', err);
        if (characterName !== 'Knight_Male') {
          this.LoadModel_('Knight_Male');
        }
      }
      
      // === 디버그 히트박스 메시 생성 ===
      if (!this.debugHitboxMesh_) {
        this.debugHitboxMesh_ = this.createDebugHitboxMesh();
        if (this.params_.scene) this.params_.scene.add(this.debugHitboxMesh_);
      }
    }

    /**
     * 'E' 키를 눌렀을 때 호출되는 함수. 플레이어 주변의 가장 가까운 무기를 줍습니다.
     */
    PickupWeapon_() {
      if (!this.params_.weapons) return;

      let closestWeapon = null;
      let minDistance = Infinity;

      this.params_.weapons.forEach(weapon => {
        if (weapon.model_) {
          const distance = this.mesh_.position.distanceTo(weapon.model_.position);
          if (distance < 2 && distance < minDistance) {
            minDistance = distance;
            closestWeapon = weapon;
          }
        }
      });

      if (closestWeapon) {
        this.params_.scene.remove(closestWeapon.model_);
        if (typeof closestWeapon.HideRangeIndicator === 'function') {
          closestWeapon.HideRangeIndicator();
        }
        const index = this.params_.weapons.indexOf(closestWeapon);
        if (index > -1) {
          this.params_.weapons.splice(index, 1);
        }
        this.EquipItem(closestWeapon);
        
        // 네트워크 동기화 - 무기 장착 상태 전송
        this.SyncNetworkState();
      }
    }    
EquipItem(item) {
      if (item.type === 'buff' && item.statEffect) {
        this.increaseStat(item.statEffect.stat, item.statEffect.amount);
        // Remove the item from the scene (it's consumed)
        if (item.model_ && item.model_.parent) {
          item.model_.parent.remove(item.model_);
        }
        this.UpdateDerivedStats();
        return; // Item consumed, no need to proceed with equipping logic
      }

      // If we reach here, it's a weapon (melee or ranged)
      if (this.equippedWeapon_) {
        // Unequip the existing weapon
        if (this.equippedWeapon_.model_ && this.equippedWeapon_.model_.parent) {
          this.equippedWeapon_.model_.parent.remove(this.equippedWeapon_.model_);
        }
        // Reset to bare hand attack properties
        this.currentAttackRadius = 1.5;
        this.currentAttackAngle = Math.PI / 2;
        this.currentAttackDamage = 10;
        this.attackCooldown_ = 0.5 * (1 - (this.agility_ * 0.1)); // Default bare hand cooldown, adjusted by agility
        this.UpdateDerivedStats();
      }

      const handBone = this.mesh_.getObjectByName('FistR');
      if (handBone && item.model_) {
        handBone.add(item.model_);
        item.model_.position.set(0, 0, 0.1);
        item.model_.rotation.set(0, 0, 0);
        item.model_.position.x = -0.01;
        item.model_.position.y = 0.09;
        item.model_.rotation.x = Math.PI;
        item.model_.rotation.y = Math.PI / 2;
        item.model_.rotation.z = Math.PI * 1.5;
        this.equippedWeapon_ = item; // Update currently equipped item

        // 새로운 무기 시스템에 무기 추가
        if (item.itemName) {
          this.weaponManager_.addWeapon(item.itemName);
          this.weaponManager_.equipWeapon(item.itemName);
        }

        // Update attack properties based on the newly equipped weapon
        this.currentAttackRadius = this.equippedWeapon_.attackRadius;
        this.currentAttackAngle = this.equippedWeapon_.attackAngle;
        this.currentAttackDamage = this.equippedWeapon_.damage;
        this.attackCooldown_ = (0.5 / this.equippedWeapon_.attackSpeedMultiplier) * (1 - (this.agility_ * 0.1));
        this.UpdateDerivedStats();
      }
    }    
    SetAnimation_(name) {
      // 원격 플레이어의 경우 currentAnimationName_만 업데이트
      if (this.isRemote) {
        this.currentAnimationName_ = name;
      }
      
      // 죽은 상태에서는 Death 애니메이션만 허용
      if (this.isDead_ && name !== 'Death') return;
      
      // Prevent overriding attack animation with movement/idle/jump
      if (this.isAttacking_ && (name === 'Run' || name === 'Walk' || name === 'Idle' || name === 'Jump')) {
        return;
      }

      if (this.currentAction_ === this.animations_[name]) return;
      if (!this.animations_[name]) {
        console.warn(`Animation ${name} not found!`);
        return;
      }
      
      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.3);
      }
      
      this.currentAction_ = this.animations_[name];
      this.currentAnimationName_ = name; // 현재 애니메이션 이름 업데이트
      this.currentAction_.reset().fadeIn(0.3).play();

      if (name === 'Jump') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.25; // 앞부분을 건너뜀
        this.currentAction_.timeScale = this.jumpSpeed_;
      } else if (name === 'Roll') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.0;
        this.currentAction_.timeScale = 1.2;
      } else if (name === 'Death') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.0;
        this.currentAction_.timeScale = 1.0;
      } else if (name === 'SwordSlash') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.15; // 10번째 프레임부터 시작 (24 FPS 가정)
        this.currentAction_.timeScale = 1.2; // 구르기와 유사하게 속도 조절
      } else if (name === 'Shoot_OneHanded') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
        this.currentAction_.time = 0.0; // 처음부터 시작
        this.currentAction_.timeScale = 1.0; // 기본 속도
      } else {
        this.currentAction_.timeScale = 1.0;
      }
    }

    createDebugHitboxMesh() {
      // CapsuleGeometry가 없으면 CylinderGeometry 사용
      const geometry = new THREE.CylinderGeometry(this.hitboxRadius_, this.hitboxRadius_, this.hitboxHeight_, 16, 1, true);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(this.position_);
      mesh.position.y += this.hitboxHeight_ / 2;
      mesh.visible = this.debugHitboxVisible_;
      return mesh;
    }

    setDebugHitboxVisible(visible) {
      this.debugHitboxVisible_ = visible;
      if (this.debugHitboxMesh_) {
        this.debugHitboxMesh_.visible = visible;
      }
      if (this.boundingBoxHelper_) {
        this.boundingBoxHelper_.visible = visible;
      }
    }    
    // 네트워크 동기화 메서드 (고급 기능 통합)
    SyncNetworkState() {
      if (this.isRemote || !this.socket) return; // 원격 플레이어거나 소켓이 없으면 동기화하지 않음
      try {
        // 플레이어 상태 데이터 구성
        const playerState = {
          id: this.socket.id,
          position: [this.position_.x, this.position_.y, this.position_.z],
          rotation: [this.mesh_ ? this.mesh_.rotation.x : 0, this.mesh_ ? this.mesh_.rotation.y : 0, this.mesh_ ? this.mesh_.rotation.z : 0],
          animation: this.currentAnimationName_ || 'Idle',
          hp: this.hp_,
          isDead: this.isDead_,
          isAttacking: this.isAttacking_,
          isRolling: this.isRolling_,
          isJumping: this.isJumping_,
          isHit: this.isHit_,
          weapon: this.equippedWeapon_ ? {
            type: this.equippedWeapon_.type,
            name: this.equippedWeapon_.name || this.equippedWeapon_.itemName,
            itemName: this.equippedWeapon_.itemName || '',
            attackRadius: this.equippedWeapon_.attackRadius || 1.5,
            attackAngle: this.equippedWeapon_.attackAngle || Math.PI / 2,
            damage: this.equippedWeapon_.damage || 10,
            attackType: this.equippedWeapon_.attackType || 'single',
            specialEffect: this.equippedWeapon_.specialEffect || null
          } : null,
          stats: {
            strength: this.strength_,
            agility: this.agility_,
            stamina: this.stamina_,
            speed: this.speed_
          },
          character: this.params_.character || 'Knight_Male',
        };
        // 소켓을 통해 상태 전송 (상태 변화가 있을 때만 전송하도록 최적화 가능)
        this.socket.emit('gameUpdate', {
          type: 'playerState',
          data: playerState
        });
      } catch (err) {
        console.error('[SyncNetworkState] 상태 전송 오류:', err);
      }
    }
    
    // 원격 플레이어 상태 업데이트 (보완: 오류/누락 fallback)
    UpdateRemoteState(state) {
      if (!this.isRemote) return;
      try {
        // 위치 업데이트
        if (state.position) this.SetPosition(state.position);
        // 회전 업데이트
        if (state.rotation) this.SetRotation(state.rotation);
        // 애니메이션 업데이트 (유효성 체크)
        if (state.animation && typeof state.animation === 'string') {
          this.SetAnimation_(state.animation);
        } else {
          console.warn('[UpdateRemoteState] 잘못된 애니메이션 상태, Idle로 fallback');
          this.SetAnimation_('Idle');
        }
        // HP 업데이트
        if (state.hp !== undefined && state.hp !== this.hp_) {
          this.hp_ = state.hp;
          if (this.hpUI) this.hpUI.updateHP(this.hp_);
        }
        // 상태 업데이트
        if (state.isDead !== undefined) this.isDead_ = state.isDead;
        if (state.isAttacking !== undefined) this.isAttacking_ = state.isAttacking;
        if (state.isRolling !== undefined) this.isRolling_ = state.isRolling;
        if (state.isJumping !== undefined) this.isJumping_ = state.isJumping;
        if (state.isHit !== undefined) this.isHit_ = state.isHit;
        // 캐릭터 동기화 (누락 시 fallback)
        if (state.character && typeof state.character === 'string') {
          if (this.params_.character !== state.character) {
            this.params_.character = state.character;
            this.LoadModel_(state.character);
          }
        } else if (!this.params_.character) {
          this.params_.character = 'Knight_Male';
          this.LoadModel_('Knight_Male');
        }
      } catch (err) {
        console.error('[UpdateRemoteState] 원격 상태 적용 오류:', err);
      }
    }
    
    // 위치 설정 (원격 플레이어용)
    SetPosition(position) {
      this.position_.set(position[0], position[1], position[2]);
      if (this.mesh_) {
        this.mesh_.position.copy(this.position_);
        // 위치가 업데이트될 때 HPUI도 업데이트
        if (this.hpUI) {
          this.hpUI.updatePosition();
        }
      }
      
      // 바운딩 박스 업데이트
      if (this.boundingBox_) {
        const halfWidth = 0.65;
        const halfHeight = 3.2;
        const halfDepth = 0.65;
        this.boundingBox_.set(
          new THREE.Vector3(this.position_.x - halfWidth, this.position_.y, this.position_.z - halfDepth),
          new THREE.Vector3(this.position_.x + halfWidth, this.position_.y + halfHeight, this.position_.z + halfDepth)
        );
      }
    }
    
    // 회전 설정 (원격 플레이어용)
    SetRotation(rotation) {
      if (this.mesh_) {
        this.mesh_.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
    }    
    Update(timeElapsed, rotationAngle = 0, collidables = []) {
      if (!this.mesh_) return;
      
      // 원격 플레이어는 간소화된 업데이트만 수행
      if (this.isRemote) {
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        // 원격 플레이어의 HPUI 위치 업데이트
        if (this.hpUI) {
          this.hpUI.updatePosition();
        }
        return;
      }
      
      this.lastRotationAngle_ = rotationAngle;
      this.attackedThisFrame_ = false; // 매 프레임마다 공격 플래그 초기화

      // 피격 타이머 업데이트
      if (this.isHit_ && this.hitTimer_ > 0) {
        this.hitTimer_ -= timeElapsed;
        if (this.hitTimer_ <= 0) {
          this.isHit_ = false;
          if (!this.isDead_) {
            this.SetAnimation_('Idle');
          }
        }
      }

      // 사망 상태 처리
      if (this.isDead_) {
        if (this.respawnTimer_ > 0) {
          this.respawnTimer_ -= timeElapsed;
          if (this.respawnTimer_ <= 0) {
            this.Respawn_();
          }
        }
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        return;
      }

      // === 낙사(맵 경계 벗어남, 바닥 아래, fallY 이하) 처리 ===
      if (map.handleFalling && map.handleFalling(this, timeElapsed)) {
        this.mesh_.position.copy(this.position_);
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        return;
      }

      // Attack 쿨타임 관리
      if (this.attackCooldownTimer_ > 0) {
        this.attackCooldownTimer_ -= timeElapsed;
        if (this.attackCooldownTimer_ < 0) this.attackCooldownTimer_ = 0;
      }

      // Attack 이동 로직 (다른 이동과 병행 가능)
      if (this.isAttacking_) {
        this.attackTimer_ -= timeElapsed;

        // 공중 공격 애니메이션 동기화 및 판정 타이밍
        if (this.isAerialAttacking_) {
          const currentAnimationName = this.currentAction_ ? this.currentAction_._clip.name : 'Idle';
          const currentAnimationTime = this.currentAction_ ? this.currentAction_.time : 0;
          const currentFrame = Math.floor(currentAnimationTime * 24);
          // 공중 공격 판정 프레임 (예: 10~12프레임)
          let StartFrame = 10, EndFrame = 12;
          if (currentFrame >= StartFrame && currentFrame < EndFrame) {
            this.canDamage_ = true;
          } else {
            this.canDamage_ = false;
          }       
   // 히트박스 생성은 한 번만
          if (this.canDamage_ && !this.hasSpawnedCurrentAerialHitbox_) {
            if (this.attackSystem && typeof this.attackSystem.createAerialAttackHitbox === 'function') {
              this.attackSystem.createAerialAttackHitbox(this);
            }
            if (this.soundManager_) {
              this.soundManager_.playSound('attack_swing');
            }
            // 원거리 무기인 경우 총구 화염 이펙트 생성
            if (this.equippedWeapon_ && this.equippedWeapon_.type === 'ranged') {
              createMuzzleFlashEffect(this, this.params_.scene);
            }
            this.hasSpawnedCurrentAerialHitbox_ = true;
          }
          // 공중 공격 종료 처리
          if (this.attackTimer_ <= 0 || this.position_.y <= 0) {
            this.isAerialAttacking_ = false;
            this.canDamage_ = false;
            this.hasSpawnedCurrentAerialHitbox_ = false;
            // 착지 시 Idle로, 아니면 Jump로 복귀
            if (this.position_.y <= 0) {
              this.SetAnimation_('Idle');
            } else {
              this.SetAnimation_('Jump');
            }
          }
        } else {
          if (this.equippedWeapon_ && this.equippedWeapon_.model_) {
            const weapon = this.equippedWeapon_.model_;
            const currentAnimationName = this.currentAction_ ? this.currentAction_._clip.name : 'Idle';
            const currentAnimationTime = this.currentAction_ ? this.currentAction_.time : 0;
            const currentFrame = Math.floor(currentAnimationTime * 24); // 24 FPS 기준
            const [rx, ry, rz] = getWeaponRotation(currentAnimationName, currentFrame);
            weapon.rotation.set(rx, ry, rz);

            // 공격 판정 구간 설정
            let StartFrame, EndFrame;
            if (currentAnimationName === 'SwordSlash') {
                // 근접 공격 판정 구간 (예: 11프레임부터 12프레임까지)
                StartFrame = 11;
                EndFrame = 12;
            } else if (currentAnimationName === 'Shoot_OneHanded') {
                // 원거리 공격 판정 구간 (예: 5프레임부터 6프레임까지)
                StartFrame = 5;
                EndFrame = 6;
            }

            if (currentFrame >= StartFrame && currentFrame < EndFrame) {
                this.canDamage_ = true;
            } else {
                this.canDamage_ = false;
            }    
        // === [신규 시스템] 투사체 기반 판정 사용 (attackSystem.js, meleeProjectile.js) ===
            if (this.canDamage_ && !this.attackedThisFrame_) {
              if (this.attackSystem) {
                // 무기 타입에 따라 파라미터 분기
                let type = 'sector';
                let angle = this.currentAttackAngle;
                let radius = this.currentAttackRadius;
                if (this.equippedWeapon_ && this.equippedWeapon_.type === 'ranged') {
                  type = 'circle';
                  angle = 0; // 원거리 공격은 각도 의미 없음
                  radius = 0.5; // 필요시 무기별 값 사용
                  createMuzzleFlashEffect(this, this.params_.scene);
                }
                const projectileSpawnPosition = new THREE.Vector3(this.mesh_.position.x, 1.0, this.mesh_.position.z);
                
                const projectile = this.attackSystem.spawnMeleeProjectile({
                  position: projectileSpawnPosition,
                  direction: this.attackDirection_.clone(),
                  weapon: this.equippedWeapon_ || { damage: this.currentAttackDamage, range: this.currentAttackRadius },
                  attacker: this,
                  onHit: (npc) => {},
                  type,
                  angle,
                  radius
                });
                this.lastMeleeProjectile = projectile;

                // 공격 사운드 재생
                if (this.soundManager_) {
                  this.soundManager_.playSound('attack_swing');
                }
              }
              this.attackedThisFrame_ = true;
            }
          }
        }

        // 공격 종료 처리 (공중/지상 모두)
        if (this.attackTimer_ <= 0) {
          this.isAerialAttacking_ = false;
          this.canDamage_ = false;
          // 공중 공격 중 착지 시 Idle, 아니면 Jump, 지상 공격은 Idle
          if (this.position_.y <= 0) {
            this.SetAnimation_('Idle');
          } else if (this.isAerialAttacking_) {
            this.SetAnimation_('Jump');
          }
        }
      }      
      // Roll 쿨타임 관리
      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
        if (this.rollCooldownTimer_ < 0) this.rollCooldownTimer_ = 0;
      }

      // 구르기 이동 로직 (다른 이동과 배타적)
      if (this.isRolling_) {
        this.rollTimer_ -= timeElapsed;
        const rollMove = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
        
        // 충돌 체크 및 슬라이딩 처리
        const tempBox = this.boundingBox_.clone();
        tempBox.translate(rollMove);
        tempBox.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, 0));

        let canMove = true;
        let adjustedRollMove = rollMove.clone();
        let isOnTop = false;
        let topY = 0;

        for (const collidable of collidables) {
          if (tempBox.intersectsBox(collidable.boundingBox)) {
            // 플레이어가 오브젝트 위에 있는지 확인
            const playerBottom = this.boundingBox_.min.y + this.velocityY_ * timeElapsed;
            const collidableTop = collidable.boundingBox.max.y;
            if (playerBottom >= collidableTop - 0.1 && this.position_.y >= collidableTop - 0.1) {
              isOnTop = true;
              topY = Math.max(topY, collidableTop);
              // X/Z 이동은 허용하되, 바운딩 박스 경계 체크
              const newTempBox = this.boundingBox_.clone();
              newTempBox.translate(rollMove);
              if (
                newTempBox.min.x > collidable.boundingBox.max.x ||
                newTempBox.max.x < collidable.boundingBox.min.x ||
                newTempBox.min.z > collidable.boundingBox.max.z ||
                newTempBox.max.z < collidable.boundingBox.min.z
              ) {
                isOnTop = false; // 경계를 벗어나면 떨어져야 함
              }
              if (isOnTop) continue; // 오브젝트 위에 있으면 X/Z 이동 허용
            }

            canMove = false;
            // X와 Z 방향을 개별적으로 테스트
            let canMoveX = true;
            let canMoveZ = true;

            // X 방향 테스트
            const tempBoxX = this.boundingBox_.clone();
            tempBoxX.translate(new THREE.Vector3(rollMove.x, this.velocityY_ * timeElapsed, 0));
            if (tempBoxX.intersectsBox(collidable.boundingBox)) {
              canMoveX = false;
            }

            // Z 방향 테스트
            const tempBoxZ = this.boundingBox_.clone();
            tempBoxZ.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, rollMove.z));
            if (tempBoxZ.intersectsBox(collidable.boundingBox)) {
              canMoveZ = false;
            } 
           // 슬라이딩: 충돌하지 않는 방향으로만 이동
            if (!canMoveX && canMoveZ) {
              adjustedRollMove.x = 0; // X 방향 이동 차단
            } else if (canMoveX && !canMoveZ) {
              adjustedRollMove.z = 0; // Z 방향 이동 차단
            } else {
              adjustedRollMove.set(0, 0, 0); // 둘 다 충돌 시 이동 차단
            }
            break; // 첫 번째 충돌 처리 후 종료
          }
        }

        if (canMove || adjustedRollMove.length() > 0) {
          this.position_.add(adjustedRollMove);
          if (isOnTop) {
            this.position_.y = topY; // 오브젝트 위에 고정
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else {
            // 중력 적용
            this.velocityY_ += this.gravity_ * timeElapsed;
            this.position_.y += this.velocityY_ * timeElapsed;
          }
        } else {
          // 중력 적용
          this.velocityY_ += this.gravity_ * timeElapsed;
          this.position_.y += this.velocityY_ * timeElapsed;
        }

        // 바닥 체크
        if (this.position_.y <= 0 && !isOnTop) {
          this.position_.y = 0;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

        if (this.rollTimer_ <= 0) {
          this.isRolling_ = false;
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          this.SetAnimation_(isMoving ? (isRunning ? 'Run' : 'Walk') : 'Idle');
        }
      } else {
        // 일반 이동 로직 (구르기 중이 아닐 때만 적용)
        let velocity = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        // 입력에 따른 방향 계산
        if (this.keys_.forward) velocity.add(forward);
        if (this.keys_.backward) velocity.sub(forward);
        if (this.keys_.left) velocity.sub(right);
        if (this.keys_.right) velocity.add(right);
        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

        // 회전 업데이트 (충돌과 무관하게 항상 처리)
        if (velocity.length() > 0.01) {
          const angle = Math.atan2(velocity.x, velocity.z);
          const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), angle
          );
          this.mesh_.quaternion.slerp(targetQuaternion, 0.3);
        }       
 const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;

        velocity.normalize().multiplyScalar(moveSpeed * timeElapsed);
        
        // 충돌 감지 및 슬라이딩 처리
        const tempBox = this.boundingBox_.clone();
        tempBox.translate(velocity);
        tempBox.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, 0));

        let canMove = true;
        let stepUpHeight = 0;
        let adjustedVelocity = velocity.clone();
        let isOnTop = false;
        let topY = 0;

        for (const collidable of collidables) {
          if (tempBox.intersectsBox(collidable.boundingBox)) {
            // 플레이어가 오브젝트 위에 있는지 확인
            const playerBottom = this.boundingBox_.min.y + this.velocityY_ * timeElapsed;
            const collidableTop = collidable.boundingBox.max.y;
            if (playerBottom >= collidableTop - 0.1 && this.position_.y >= collidableTop - 0.1) {
              isOnTop = true;
              topY = Math.max(topY, collidableTop);
              // X/Z 이동은 허용하되, 바운딩 박스 경계 체크
              const newTempBox = this.boundingBox_.clone();
              newTempBox.translate(velocity);
              if (
                newTempBox.min.x > collidable.boundingBox.max.x ||
                newTempBox.max.x < collidable.boundingBox.min.x ||
                newTempBox.min.z > collidable.boundingBox.max.z ||
                newTempBox.max.z < collidable.boundingBox.min.z
              ) {
                isOnTop = false; // 경계를 벗어나면 떨어져야 함
              }
              if (isOnTop) continue; // 오브젝트 위에 있으면 X/Z 이동 허용
            }

            const boxMaxY = collidable.boundingBox.max.y;
            if (boxMaxY <= this.position_.y + 0.5 && boxMaxY > this.position_.y) {
              stepUpHeight = Math.max(stepUpHeight, boxMaxY - this.position_.y);
            } else {
              canMove = false;
              // X와 Z 방향을 개별적으로 테스트
              let canMoveX = true;
              let canMoveZ = true;

              // X 방향 테스트
              const tempBoxX = this.boundingBox_.clone();
              tempBoxX.translate(new THREE.Vector3(velocity.x, this.velocityY_ * timeElapsed, 0));
              if (tempBoxX.intersectsBox(collidable.boundingBox)) {
                canMoveX = false;
              }

              // Z 방향 테스트
              const tempBoxZ = this.boundingBox_.clone();
              tempBoxZ.translate(new THREE.Vector3(0, this.velocityY_ * timeElapsed, velocity.z));
              if (tempBoxZ.intersectsBox(collidable.boundingBox)) {
                canMoveZ = false;
              }  
            // 슬라이딩: 충돌하지 않는 방향으로만 이동
              if (!canMoveX && canMoveZ) {
                adjustedVelocity.x = 0; // X 방향 이동 차단
              } else if (canMoveX && !canMoveZ) {
                adjustedVelocity.z = 0; // Z 방향 이동 차단
              } else {
                adjustedVelocity.set(0, 0, 0); // 둘 다 충돌 시 이동 차단
              }
              break;
            }
          }
        }

        if (canMove || adjustedVelocity.length() > 0) {
          this.position_.add(adjustedVelocity);
          if (stepUpHeight > 0) {
            this.position_.y += stepUpHeight;
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else if (isOnTop) {
            this.position_.y = topY; // 오브젝트 위에 고정
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else {
            // 중력 적용
            this.velocityY_ += this.gravity_ * timeElapsed;
            this.position_.y += this.velocityY_ * timeElapsed;
          }
        } else {
          // 중력 적용
          this.velocityY_ += this.gravity_ * timeElapsed;
          this.position_.y += this.velocityY_ * timeElapsed;
        }

        // 바닥 체크
        if (this.position_.y <= 0 && !isOnTop) {
          this.position_.y = 0;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

        // 애니메이션 업데이트
        if (this.position_.y > 0 && this.isJumping_) {
          this.SetAnimation_('Jump');
        } else if (isMoving && !this.isAttacking_) {
          this.SetAnimation_(isRunning ? 'Run' : 'Walk');
        } else if (!this.isAttacking_) {
          this.SetAnimation_('Idle');
        }
      }

      this.mesh_.position.copy(this.position_);
      
      // 바운딩 박스 위치를 플레이어에 맞춰 업데이트
      const halfWidth = 0.65;
      const halfHeight = 3.2;
      const halfDepth = 0.65;
      this.boundingBox_.set(
        new THREE.Vector3(this.position_.x - halfWidth, this.position_.y, this.position_.z - halfDepth),
        new THREE.Vector3(this.position_.x + halfWidth, this.position_.y + halfHeight, this.position_.z + halfDepth)
      );
      
      // 디버그 히트박스 업데이트
      if (this.debugHitboxMesh_) {
        this.debugHitboxMesh_.position.copy(this.position_);
        this.debugHitboxMesh_.position.y += this.hitboxHeight_ / 2;
      }

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }

      // HPUI 위치 업데이트
      if (this.hpUI) {
        this.hpUI.updatePosition();
      }
      
      // 네트워크 동기화 - 주기적으로 상태 전송
      // 최적화를 위해 일정 시간마다 또는 중요한 상태 변화가 있을 때만 전송하는 것이 좋음
      this.SyncNetworkState();
    }
    // 공격 동기화: 공격 시 네트워크로 공격 정보 전송 (공격 애니메이션/데미지/위치 등)
    AttackSync(attackInfo) {
      if (this.isRemote || !this.socket) return;
      try {
        this.socket.emit('player-attack', attackInfo);
      } catch (err) {
        console.error('[AttackSync] 공격 정보 전송 오류:', err);
      }
    }
    // 공격 정보 수신 시 처리 (외부에서 호출 필요)
    OnRemoteAttack(attackInfo) {
      try {
        // 공격 애니메이션 및 이펙트 재생
        if (!this.isRemote) return;
        this.SetAnimation_('Attack');
        // TODO: 공격 이펙트/피격 판정 등 추가 구현 가능
      } catch (err) {
        console.error('[OnRemoteAttack] 원격 공격 처리 오류:', err);
      }
    }
  }

  return {
    Player: Player,
  };
})();