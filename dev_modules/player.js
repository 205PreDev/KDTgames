// player.js
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
      this.position_ = map && map.RESPAWN_POSITION ? map.RESPAWN_POSITION.clone() : new THREE.Vector3(0, 0, 0);
      this.position_.y = map && map.MAP_BOUNDS ? map.MAP_BOUNDS.minY : 0;
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.speed_ = 5;
      this.params_ = params;
      this.mesh_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.hp_ = this.maxHp_;
      this.isDead_ = false;
      this.soundManager_ = params.soundManager; // SoundManager 인스턴스 추가
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
      this.inventory_ = [];
      this.equippedWeapon_ = null;
      this.weaponManager_ = new WeaponManager(); // 새로운 무기 시스템 매니저
      this.attackSystem = new AttackSystem(params.scene || (params && params.scene));
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
      this.deathTimer_ = 0;
      this.fallDamageTimer_ = 0;
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
      this.hpUI = params.hpUI || null;
      this.headBone = null; // 머리 뼈를 저장할 속성
      this.isPicking_ = false; // 아이템 줍는지 여부
      this.attackedThisFrame_ = false; // 한 프레임에 여러 번 공격하는 것을 방지
      this.hitEnemies_ = new Set(); // 현재 공격으로 피해를 입은 적들을 추적
      this.currentAttackRadius = 1.5; // 기본 맨손 공격 반경
      this.currentAttackAngle = Math.PI / 2; // 기본 맨손 공격 각도 (90 degrees)
      this.currentAttackDamage = 0;
      // Player Stats
      this.strength_ = 0;
      this.agility_ = 0;
      this.stamina_ = 0;
      // Derived Stats
      this.maxHp_ = 100 * (1 + (this.stamina_ * 0.1)); // Initial base HP, will be modified by stamina
      // 피격 시스템 추가
      this.isHit_ = false; // 피격 상태
      this.hitTimer_ = 0; // 피격 타이머
      this.hitDuration_ = 0.5; // 피격 지속 시간
      this.debugHitboxMesh_ = null;
      this.debugHitboxVisible_ = false;
      this.hitboxRadius_ = 0.7;
      this.hitboxHeight_ = 1.8;

      this.LoadModel_();
      this.InitInput_();
      this.UpdateDerivedStats(); // Initial stat calculation
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

    canTakeDamage() {
      // 플레이어가 죽었거나 피격 중이 아니면 피해를 받을 수 있음
      return !this.isDead_ && !this.isHit_;
    }

    TakeDamage(amount) {
      if (!this.canTakeDamage()) return; // 피해를 받을 수 없는 상태면 무시
      
      this.hp_ -= amount;
      if (this.hp_ <= 0) {
        this.hp_ = 0;
        if (this.hpUI && typeof this.hpUI.forceDeath === 'function') {
          this.hpUI.forceDeath();
        }
        this.isDead_ = true;
        this.deathTimer_ = 5.0;
        this.SetAnimation_('Death');
      } else {
        // 피격 상태 설정
        this.isHit_ = true;
        this.hitTimer_ = this.hitDuration_;
        this.SetAnimation_('ReceiveHit'); // 피해를 입었을 때 ReceiveHit 애니메이션 호출
        if (this.soundManager_) {
          this.soundManager_.playSound('hit_impact');
        }
      }
    }

    Revive() {
      this.Respawn_();
    }

    Respawn_() {
      this.hp_ = this.maxHp_;
      this.isDead_ = false;
      this.deathTimer_ = 0;
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
      this.velocity_.set(0, 0, 0);
      this.velocityY_ = 0;
      this.isJumping_ = false;
      this.isRolling_ = false;
      this.rollCooldownTimer_ = 0;
      this.SetAnimation_('Idle');
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
        default:
          console.warn(`Unknown stat: ${statName}`);
      }
      this.UpdateDerivedStats();
    }

    OnKeyDown_(event) {
      
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

    LoadModel_() {
      const loader = new GLTFLoader();
      loader.setPath('./resources/char/glTF/');
      loader.load('Suit_male.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(1);
        model.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        this.mesh_ = model;
        this.params_.scene.add(model);

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            if (c.material) {
              c.material.color.offsetHSL(0, 0, 0.25);
            }
          }
          if (c.isBone && c.name === 'Head') {
            this.headBone = c;
          }
        });

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
          } else if (e.action.getClip().name === 'ReceiveHit') {
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
      }, undefined, (error) => {
        console.error("Error loading model:", error);
      });
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
    }

    Update(timeElapsed, rotationAngle = 0) {
      if (!this.mesh_) return;
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

      if (this.isDead_) {
        if (this.deathTimer_ > 0) {
          this.deathTimer_ -= timeElapsed;
          if (this.deathTimer_ <= 0) {
            this.deathTimer_ = 0;
            this.isDead_ = false;
            this.SetAnimation_('Idle');
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
        this.position_.add(rollMove);

        if (this.rollTimer_ <= 0) {
            this.isRolling_ = false;
        }
      }

      // 일반 이동 로직 (구르기 중이 아닐 때만 적용)
      let currentSpeed = 0;
      if (!this.isRolling_) {
        const velocity = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        if (this.keys_.forward) velocity.add(forward);
        if (this.keys_.backward) velocity.sub(forward);
        if (this.keys_.left) velocity.sub(right);
        if (this.keys_.right) velocity.add(right);
        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        // Adjust base speed by agility
        const baseSpeed = 5 * (1 + (this.agility_ * 0.1));
        currentSpeed = isRunning ? baseSpeed * 2 : baseSpeed;
        
        velocity.normalize().multiplyScalar(currentSpeed * timeElapsed);
        this.position_.add(velocity);

        this.velocityY_ += this.gravity_ * timeElapsed;
        this.position_.y += this.velocityY_ * timeElapsed;

        if (this.position_.y <= 0) {
            this.position_.y = 0;
            this.velocityY_ = 0;
            this.isJumping_ = false;
        }

        if (this.position_.y > 0 && this.isJumping_) {
            this.SetAnimation_('Jump');
        }

        if (velocity.length() > 0.01) {
          const angle = Math.atan2(velocity.x, velocity.z);
          const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), angle
          );
          this.mesh_.quaternion.slerp(targetQuaternion, 0.3);
        }
      }

      // 애니메이션 선택 로직 (이동 로직과 분리)
      if (this.isDead_) {
          this.SetAnimation_('Death');
      } else if (this.isRolling_) {
          this.SetAnimation_('Roll');
      } else if (this.isAttacking_) { // 공격 중일 때 최우선
          // 공격 애니메이션은 이미 SetAnimation_에서 설정되었으므로 여기서는 아무것도 하지 않음
      } else if (this.isJumping_) { // 공격 중이 아니고 점프 중일 때
          this.SetAnimation_('Jump');
      } else if (this.isPicking_) {
        this.SetAnimation_('PickUp');
      } else { // Not dead, rolling, attacking, jumping, or picking
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          if (isMoving) {
              this.SetAnimation_(isRunning ? 'Run' : 'Walk');
          } else {
              this.SetAnimation_('Idle'); // Default idle motion
          }
      }

      this.mesh_.position.copy(this.position_);
      // === 디버그 히트박스 위치 동기화 ===
      if (this.debugHitboxMesh_) {
        this.debugHitboxMesh_.position.copy(this.position_);
        this.debugHitboxMesh_.position.y += this.hitboxHeight_ / 2;
        this.debugHitboxMesh_.visible = this.debugHitboxVisible_ && window.DEBUG_MODE_HITBOXES;
      }

      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }

      // 무기 범위 표시 업데이트
      if (this.params_.weapons) {
        this.params_.weapons.forEach(weapon => {
          if (weapon.model_) {
            const distance = this.mesh_.position.distanceTo(weapon.model_.position);
            if (distance < 2) {
              weapon.ShowRangeIndicator();
            } else {
              weapon.HideRangeIndicator();
            }
          }
        });
      }
    }
  }

  return {
    Player: Player,
  };
})();