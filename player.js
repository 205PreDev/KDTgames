// player.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import { Item } from './item.js';
import * as map from './map.js';

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
      this.hp_ = 100;
      this.isDead_ = false;
      this.keys_ = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
        e_key: false,
        ctrl_key: false,
      };
      this.inventory_ = [];
      this.equippedWeapon_ = null;
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
      this.hpUI = params.hpUI || null;

      this.LoadModel_();
      this.InitInput_();
    }

    InitInput_() {
      window.addEventListener('keydown', (e) => this.OnKeyDown_(e), false);
      window.addEventListener('keyup', (e) => this.OnKeyUp_(e), false);
    }

    TakeDamage(amount) {
      if (this.isDead_) return;
      this.hp_ -= amount;
      if (this.hp_ <= 0) {
        this.hp_ = 0;
        if (this.hpUI && typeof this.hpUI.forceDeath === 'function') {
          this.hpUI.forceDeath();
        }
        this.isDead_ = true;
        this.deathTimer_ = 5.0;
        this.SetAnimation_('Death');
      }
    }

    Revive() {
      this.Respawn_();
    }

    Respawn_() {
      this.hp_ = 100;
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
          if (!this.isJumping_ && !this.isRolling_) {
            this.isJumping_ = true;
            this.velocityY_ = this.jumpPower_;
            this.SetAnimation_('Jump');
            console.log('Playing animation:', this.currentAction_ ? this.currentAction_._clip.name : 'None');
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
            console.log('Playing animation:', this.currentAction_ ? this.currentAction_._clip.name : 'None');
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
      }
    }

    LoadModel_() {
      const loader = new GLTFLoader();
      loader.setPath('./resources/char/glTF/');
      loader.load('cow.gltf', (gltf) => {
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
        });

        this.mixer_ = new THREE.AnimationMixer(model);

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
        console.log("Available animations:", Object.keys(this.animations_));
      }, undefined, (error) => {
        console.error("Error loading model:", error);
      });
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
        console.log('무기 획득:', closestWeapon);
        this.EquipItem(closestWeapon);
      }
    }

    EquipItem(item) {
      if (this.equippedWeapon_) {
        // 기존 무기 해제
        if (this.equippedWeapon_.model_ && this.equippedWeapon_.model_.parent) {
          this.equippedWeapon_.model_.parent.remove(this.equippedWeapon_.model_);
        }
        // 해제된 무기를 다시 맵에 추가 (선택 사항, 현재는 그냥 사라지게 둠)
        // this.params_.scene.add(this.equippedWeapon_.model_);
        // this.params_.weapons.push(this.equippedWeapon_); // 다시 획득 가능한 무기 목록에 추가
      }

      const handBone = this.mesh_.getObjectByName('FistR') || this.mesh_.getObjectByName('HandR');
      if (handBone && item.model_) {
        handBone.add(item.model_);
        item.model_.position.set(0, 0, 0.1);
        item.model_.rotation.set(0, 0, 0);
        item.model_.position.x = -0.01;
        item.model_.position.y = 0.09;
        item.model_.rotation.x = Math.PI / 2;
        item.model_.rotation.y = Math.PI / 2;
        this.equippedWeapon_ = item; // 현재 장착 아이템 업데이트
      }
    }

    SetAnimation_(name) {
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
      } else {
        this.currentAction_.timeScale = 1.0;
      }
    }

    Update(timeElapsed, rotationAngle = 0) {
      if (!this.mesh_) return;
      this.lastRotationAngle_ = rotationAngle;

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

      // Roll 쿨타임 관리
      if (this.rollCooldownTimer_ > 0) {
        this.rollCooldownTimer_ -= timeElapsed;
        if (this.rollCooldownTimer_ < 0) this.rollCooldownTimer_ = 0;
      }

      if (this.isRolling_) {
    this.rollTimer_ -= timeElapsed;
    const rollMove = this.rollDirection_.clone().multiplyScalar(this.rollSpeed_ * timeElapsed);
    this.position_.add(rollMove);

    if (this.rollTimer_ <= 0) {
        this.isRolling_ = false;
        const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
        const isRunning = isMoving && this.keys_.shift;
        if (isMoving) {
            this.SetAnimation_(isRunning ? 'Run' : 'Walk');
        } else {
            this.SetAnimation_('Idle');
        }
    }
} else {
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
        const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;
        velocity.normalize().multiplyScalar(moveSpeed * timeElapsed);
        this.position_.add(velocity);
        this.velocityY_ += this.gravity_ * timeElapsed;
        this.position_.y += this.velocityY_ * timeElapsed;

        if (this.position_.y <= 0) {
            this.position_.y = 0;
            this.velocityY_ = 0;
            if (isMoving) {
                this.SetAnimation_(isRunning ? 'Run' : 'Walk');
            } else {
                this.SetAnimation_('Idle');
            }
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

      this.mesh_.position.copy(this.position_);

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
