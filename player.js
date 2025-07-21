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
      this.position_ = new THREE.Vector3(0, 0, 0);
      this.velocity_ = new THREE.Vector3(0, 0, 0);
      this.speed_ = 5;
      this.params_ = params;
      this.mesh_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.currentAnimationName_ = 'Idle';
      this.keys_ = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        debug: false,
      };
      this.jumpPower_ = 12;
      this.gravity_ = -30;
      this.isJumping_ = false;
      this.velocityY_ = 0;
      this.jumpSpeed_ = 0.5;
      this.maxStepHeight_ = 0.5;
      this.boundingBox_ = new THREE.Box3();
      this.boundingBoxHelper_ = null;
      this.isRolling_ = false;
      this.rollDuration_ = 0.5;
      this.rollTimer_ = 0;
      this.rollSpeed_ = 18;
      this.rollDirection_ = new THREE.Vector3(0, 0, 0);
      this.rollCooldown_ = 1.0;
      this.rollCooldownTimer_ = 0;

      this.hp_ = 100; // HP 속성 추가
      this.hpUI = params.hpUI || null; // HPUI 인스턴스 받기
      this.isDead_ = false; // 죽음 상태 플래그 추가
      this.respawnDelay_ = 3; // 리스폰 딜레이 (초) 5초에서 4초로 변경
      this.respawnTimer_ = 0; // 리스폰 타이머
      this.weaponManager_ = new WeaponManager(); // 무기 관리자 초기화

      this.LoadModel_(params.character);
      if (!params.isRemote) {
        // 사망 오버레이 (상단: "또 죽었어?", 중앙: 카운트다운)
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100vw';
        this.overlay.style.height = '100vh';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.overlay.style.zIndex = '999';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.visibility = 'hidden';

        // 오버레이 상단 문구
        this.overlayTopMsg = document.createElement('div');
        this.overlayTopMsg.innerText = 'Died';
        this.overlayTopMsg.style.position = 'absolute';
        this.overlayTopMsg.style.top = '40px';
        this.overlayTopMsg.style.left = '50%';
        this.overlayTopMsg.style.transform = 'translateX(-50%)';
        this.overlayTopMsg.style.fontSize = '90px';
        this.overlayTopMsg.style.fontWeight = '900';
        this.overlayTopMsg.style.fontFamily = 'Impact, Arial Black, sans-serif';
        this.overlayTopMsg.style.color = '#ff2222';
        this.overlayTopMsg.style.textShadow =
          '0 0 16px #ff4444, 0 4px 16px #000, 2px 2px 0 #fff, 0 0 2px #fff';
        this.overlayTopMsg.style.letterSpacing = '2px';
        this.overlayTopMsg.style.userSelect = 'none';
        this.overlayTopMsg.style.animation = 'shake 0.5s infinite alternate';
        this.overlay.appendChild(this.overlayTopMsg);

        // CSS 애니메이션(흔들림 효과) 추가
        const style = document.createElement('style');
        style.innerHTML = `
@keyframes shake {
  0% { transform: translateX(-50%) rotate(-2deg); }
  100% { transform: translateX(-50%) rotate(2deg); }
}`;
        document.head.appendChild(style);

        // 오버레이 중앙 카운트다운
        this.overlayCountdown = document.createElement('div');
        this.overlayCountdown.innerText = '3';
        this.overlayCountdown.style.fontSize = '150px';
        this.overlayCountdown.style.fontWeight = 'bold';
        this.overlayCountdown.style.color = '#000000';
        this.overlayCountdown.style.textShadow = '2px 2px 8px #000';
        this.overlayCountdown.style.marginBottom = '0';
        this.overlayCountdown.style.marginTop = '0';
        this.overlay.appendChild(this.overlayCountdown);

        document.body.appendChild(this.overlay);

        // 피격 효과 빨간 화면
        this.hitEffect = document.createElement('div');
        this.hitEffect.style.position = 'fixed';
        this.hitEffect.style.top = '0';
        this.hitEffect.style.left = '0';
        this.hitEffect.style.width = '100vw';
        this.hitEffect.style.height = '100vh';
        this.hitEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.25)';
        this.hitEffect.style.zIndex = '998';
        this.hitEffect.style.pointerEvents = 'none';
        this.hitEffect.style.opacity = '0';
        this.hitEffect.style.transition = 'opacity 0.1s ease-out';
        document.body.appendChild(this.hitEffect);

        this.countdownTimer = null; // New variable

        this.InitInput_();
        this.UpdateDerivedStats(); // Initial stat calculation
      }
    }

    UpdateDerivedStats() {
      this.maxHp_ = 100 * (1 + (this.stamina_ * 0.1));
      const baseDamage = this.equippedWeapon_ ? this.equippedWeapon_.damage : 10; // 10 is bare-hand damage
      this.currentAttackDamage = baseDamage + this.strength_ * 5; // Strength increases damage
      this.speed_ = 5 * (1 + (this.agility_ * 0.1));
      this.attackCooldown_ = (this.equippedWeapon_ ? (0.5 / this.equippedWeapon_.attackSpeedMultiplier) : 0.5) * (1 - (this.agility_ * 0.1));
  }

    TakeDamage(amount) {
      if (this.hp_ <= 0) return; // 이미 죽었으면 데미지 입지 않음

      this.hp_ -= amount;
      if (this.hp_ < 0) this.hp_ = 0;
      if (this.hpUI) {
        this.hpUI.updateHP(this.hp_);
      }

      // 피격 효과 (로컬 플레이어에게만 적용)
      if (!this.params_.isRemote && this.hitEffect) {
        this.hitEffect.style.opacity = '1';
        setTimeout(() => {
          this.hitEffect.style.opacity = '0';
        }, 100); // 0.1초 동안 표시
      }

      // HP가 0보다 클 때만 receievehit 애니메이션 재생
      if (this.hp_ > 0) {
        this.SetAnimation_('receievehit'); // receievehit 애니메이션 재생
      }

      if (this.hp_ === 0) {
        this.isDead_ = true; // 죽음 상태로 설정
        this.SetAnimation_('Death'); // Death 애니메이션 재생
        if (!this.params_.isRemote) {
          this.DisableInput_(); // 키 입력 비활성화
          this.respawnTimer_ = this.respawnDelay_; // 리스폰 타이머 초기화

          if (this.overlay) {
            this.overlay.style.visibility = 'visible';
            this.startCountdown();
          }
        }
      }
    }

    pickupWeapon(weaponFileName) {
      const weapon = this.weaponManager_.addWeapon(weaponFileName);
      if (weapon) {
        console.log(`Player picked up ${weapon.name}`);
        // Optionally, equip the weapon immediately
        if (!this.weaponManager_.getEquippedWeapon()) {
          this.weaponManager_.equipWeapon(weaponFileName);
          console.log(`Equipped ${weapon.name}`);
        }
        return true;
      }
      return false;
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
        debug: false,
      };
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
      if (this.hp_ <= 0) return; // 죽었으면 입력 무시
      switch (event.code) {
        case 'KeyW': this.keys_.forward = true; break;
        case 'KeyS': this.keys_.backward = true; break;
        case 'KeyA': this.keys_.left = true; break;
        case 'KeyD': this.keys_.right = true; break;
        case 'KeyE': this.keys_.e_key = true; this.PickupWeapon_(); break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys_.shift = true; break;
        case 'KeyK':
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
          /*
        case 'KeyB':
          this.keys_.debug = !this.keys_.debug;
          this.UpdateDebugVisuals();
          break;*/
      }
    }

    OnKeyUp_(event) {
      if (this.hp_ <= 0) return; // 죽었으면 입력 무시
      switch (event.code) {
        case 'KeyW': this.keys_.forward = false; break;
        case 'KeyS': this.keys_.backward = false; break;
        case 'KeyA': this.keys_.left = false; break;
        case 'KeyD': this.keys_.right = false; break;
        case 'KeyE': this.keys_.e_key = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys_.shift = false; break;
        case 'KeyJ':
          this.keys_.j_key = false; break;
      }
    }

    LoadModel_(characterName = 'Knight_Male') { // 기본값으로 Knight_Male 설정
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
            if (c.material) {
              c.material.color.offsetHSL(0, 0, 0.25);
            }
          }
          if (c.isBone && c.name === 'Head') { // Head bone 찾기
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
      });
      // === 디버그 히트박스 메시 생성 ===
      if (!this.debugHitboxMesh_) {
        this.debugHitboxMesh_ = this.createDebugHitboxMesh();
        if (this.params_.scene) this.params_.scene.add(this.debugHitboxMesh_);
      }
    }

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
      if (this.isAttacking_ && (name === 'Run' || name === 'Walk' || name === 'Idle' || name === 'Jump')) {
        return;
      }

      this.currentAnimationName_ = name;
      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.3);
      }

      const newAction = this.animations_[name];
      if (newAction) {
        this.currentAction_ = newAction;
        this.currentAction_.reset().fadeIn(0.3).play();
        if (name === 'Jump') {
          this.currentAction_.setLoop(THREE.LoopOnce);
          this.currentAction_.clampWhenFinished = true;
          this.currentAction_.time = 0.25;
          this.currentAction_.timeScale = this.jumpSpeed_;
        } else if (name === 'Roll') {
          this.currentAction_.setLoop(THREE.LoopOnce);
          this.currentAction_.clampWhenFinished = true;
          this.currentAction_.time = 0.0;
          this.currentAction_.timeScale = 1.2;
        } else if (name === 'Death') {
          this.currentAction_.setLoop(THREE.LoopOnce);
          this.currentAction_.clampWhenFinished = true;
        }else if (name === 'SwordSlash') {
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
      } else {
        console.warn(`Animation "${name}" not found for character. Falling back to Idle.`);
        this.currentAction_ = this.animations_['Idle']; // Fallback to Idle
        if (this.currentAction_) {
          this.currentAction_.reset().fadeIn(0.3).play();
        }
        this.currentAnimationName_ = 'Idle'; // Update current animation name to Idle
      }
    }

    Respawn_() {
      this.hp_ = this.maxHp_;
      this.isDead_ = false; // 죽음 상태 해제
      if (this.hpUI) {
        this.hpUI.updateHP(this.hp_); // HPUI 업데이트
      }
      this.InitInput_(); // 입력 활성화
      this.SetAnimation_('Idle'); // Idle 애니메이션으로 설정
      if (this.params_.getRespawnPosition) {
        const respawnPosition = this.params_.getRespawnPosition();
        this.SetPosition([respawnPosition.x, respawnPosition.y, respawnPosition.z]);
      } else {
        this.SetPosition([0, 0, 0]); // Fallback to default position
      }

      if (this.overlay) {
        this.overlay.style.visibility = 'hidden';
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }

    SetPosition(position) {
      this.position_.set(position[0], position[1], position[2]);
      if (this.mesh_) {
        this.mesh_.position.copy(this.position_);
        // 위치가 업데이트될 때 HPUI도 업데이트
        if (this.hpUI) {
          this.hpUI.updatePosition();
        }
      }
    }

    SetRotation(rotation) {
      if (this.mesh_) {
        this.mesh_.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
    }

    SetRemoteAnimation(animationName) {
      this.SetAnimation_(animationName);
    }

    startCountdown() {
      let count = Math.floor(this.respawnDelay_); // 3초부터 시작
      this.overlayCountdown.innerText = count;

      this.countdownTimer = setInterval(() => {
        count--;
        if (count >= 1) { // 1까지만 표시
          this.overlayCountdown.innerText = count;
        } else {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }, 1000);
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
    UpdateDebugVisuals() {
      if (this.boundingBoxHelper_) {
        this.boundingBoxHelper_.visible = this.keys_.debug;
      }
      if (this.params_.onDebugToggle) {
        this.params_.onDebugToggle(this.keys_.debug);
      }
    }

    Update(timeElapsed, rotationAngle = 0, collidables = []) {
      if (this.params_.isRemote) {
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        // 원격 플레이어의 HPUI 위치 업데이트
        if (this.hpUI) {
          this.hpUI.updatePosition();
        }
        return;
      }
      if (!this.mesh_) return;

      if (this.isDead_) {
        this.respawnTimer_ -= timeElapsed;
        if (this.respawnTimer_ <= 0) {
          this.Respawn_();
        }
        if (this.mixer_) {
          this.mixer_.update(timeElapsed);
        }
        return; // 죽은 상태에서는 다른 업데이트 로직을 건너뜀
      }

      this.lastRotationAngle_ = rotationAngle;

      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
        if (this.rollCooldownTimer_ < 0) this.rollCooldownTimer_ = 0;
      }

      let newPosition = this.position_.clone();
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

      if (this.isRolling_) {
        this.rollTimer_ -= timeElapsed;
        const rollMove = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
        newPosition.add(rollMove);

        // 중력 적용
        this.velocityY_ += this.gravity_ * timeElapsed;
        newPosition.y += this.velocityY_ * timeElapsed;

        // 구르기 중 충돌 체크 및 슬라이딩 처리
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

            // 충돌 발생 시 이전 위치로 되돌리고 Y 속도 0으로 설정
            // newPosition.copy(this.position_);
            // this.velocityY_ = 0;
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
            this.position_.y = newPosition.y; // 중력에 따라 Y 이동
          }
        } else {
          this.position_.y = newPosition.y; // Y 이동은 허용
        }

        // 바닥 체크
        if (this.position_.y <= 0 && !isOnTop) {
          this.position_.y = 0;
          this.velocityY_ = 0;
          this.isJumping_ = false;
        }

      // Attack 쿨타임 관리
      if (this.attackCooldownTimer_ > 0) {
        this.attackCooldownTimer_ -= timeElapsed;
        if (this.attackCooldownTimer_ < 0) this.attackCooldownTimer_ = 0;
      }

        if (this.isAttacking_) { // Attack 이동 로직 (다른 이동과 병행 가능)
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

        if (this.rollTimer_ <= 0) {
          this.isRolling_ = false;
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          this.SetAnimation_(isMoving ? (isRunning ? 'Run' : 'Walk') : 'Idle');
        }
      } else {
        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;

        velocity.normalize().multiplyScalar(moveSpeed * timeElapsed);
        newPosition.add(velocity);

        // 중력 적용
        this.velocityY_ += this.gravity_ * timeElapsed;
        newPosition.y += this.velocityY_ * timeElapsed;

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
            if (boxMaxY <= this.position_.y + this.maxStepHeight_ && boxMaxY > this.position_.y) {
              stepUpHeight = Math.max(stepUpHeight, boxMaxY - this.position_.y);
            } else {
              // 충돌 발생 시 이전 위치로 되돌리고 Y 속도 0으로 설정
              // newPosition.copy(this.position_);
              // this.velocityY_ = 0;
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
          newPosition = this.position_.clone().add(adjustedVelocity);
          newPosition.y += this.velocityY_ * timeElapsed;
          this.position_.copy(newPosition);
          if (stepUpHeight > 0) {
            this.position_.y = newPosition.y + stepUpHeight;
            this.velocityY_ = 0;
            this.isJumping_ = false;
          } else if (isOnTop) {
            this.position_.y = topY; // 오브젝트 위에 고정
            this.velocityY_ = 0;
            this.isJumping_ = false;
          }
        } else {
          this.position_.y = newPosition.y; // Y 이동은 허용
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
        } else if (isMoving) {
          this.SetAnimation_(isRunning ? 'Run' : 'Walk');
        } else {
          this.SetAnimation_('Idle');
        }
      }

      this.mesh_.position.copy(this.position_);
      // 바운딩 박스 위치를 플레이어에 맞춰 업데이트
      const halfWidth = 0.65; // 너비: 1.0
      const halfHeight = 3.2; // 높이: 2.5
      const halfDepth = 0.65; // 깊이: 1.0
      this.boundingBox_.set(
        new THREE.Vector3(this.position_.x - halfWidth, this.position_.y, this.position_.z - halfDepth),
        new THREE.Vector3(this.position_.x + halfWidth, this.position_.y + halfHeight, this.position_.z + halfDepth)
      );

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

      // HPUI 위치 업데이트
      if (this.hpUI) {
        this.hpUI.updatePosition();
      }

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