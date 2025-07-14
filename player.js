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
      this.hp_ = this.maxHp_;
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
      this.attackCooldown_ = 0.5; // 쿨타임 설정 (예: 0.5초)
      this.attackCooldownTimer_ = 0; // 현재 쿨타임 타이머
      this.attackTimer_ = 0; // Attack 타이머
      this.attackSpeed_ = 18; // Attack 이동 속도
      this.attackDirection_ = new THREE.Vector3(0, 0, 0); // Attack 방향
      this.isAttacking_ = false; // 공격 중인지 여부
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

    TakeDamage(amount) {
      if (this.isDead_ || this.isHit_) return; // 이미 죽었거나 피격 중이면 무시
      
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
        console.log(`Player is hit! Playing ReceiveHit animation.`);
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
            console.log('Playing animation:', this.currentAction_ ? this.currentAction_._clip.name : 'None');
          }
          break;
        case 'KeyJ':
          if (this.isAttacking_ || this.isHit_) return; // 공격 중이거나 피격 중에는 Attack 불가
          
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
            this.attackDirection_.copy(moveDir);
            this.SetAnimation_(attackAnimation); // 무기 타입에 따른 애니메이션 사용
            this.hitEnemies_.clear(); // 새로운 공격 시작 시 hitEnemies 초기화

            this.attackCooldownTimer_ = this.attackCooldown_;
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
            this.isAttacking_ = false;
            this.canDamage_ = false; // 공격 애니메이션 끝나면 초기화
            this.hitEnemies_.clear(); // 공격 종료 시 hitEnemies 초기화
            // 공격 애니메이션이 끝나면 Idle 또는 Walk/Run 애니메이션으로 전환
            const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
            const isRunning = isMoving && this.keys_.shift;
            if (isMoving) {
                this.SetAnimation_(isRunning ? 'Run' : 'Walk');
            } else {
                this.SetAnimation_('Idle');
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
        console.log("Available animations:", Object.keys(this.animations_));
        this.SetAnimation_('Idle');
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

      const handBone = this.mesh_.getObjectByName('FistR') || this.mesh_.getObjectByName('HandR');
      if (handBone && item.model_) {
        handBone.add(item.model_);
        item.model_.position.set(0, 0, 0.1);
        item.model_.rotation.set(0, 0, 0);
        item.model_.position.x = -0.01;
        item.model_.position.y = 0.09;
        item.model_.rotation.x = Math.PI / 2;
        item.model_.rotation.y = Math.PI / 2;
        item.model_.rotation.z = Math.PI * 1.5;
        this.equippedWeapon_ = item; // Update currently equipped item

        // Update attack properties based on the newly equipped weapon
        this.currentAttackRadius = this.equippedWeapon_.attackRadius;
        this.currentAttackAngle = this.equippedWeapon_.attackAngle;
        this.currentAttackDamage = this.equippedWeapon_.damage;
        this.attackCooldown_ = (0.5 / this.equippedWeapon_.attackSpeedMultiplier) * (1 - (this.agility_ * 0.1));
        this.UpdateDerivedStats();
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

      // --- 무기 자세 제어 로직 ---
      if (this.equippedWeapon_ && this.equippedWeapon_.model_) {
        const weapon = this.equippedWeapon_.model_;
        switch (name) {
          case 'SwordSlash':
            weapon.position.set(-0.05, 0.05, -0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0); // Default rotation, will be overridden by Update
            break;

          case 'Shoot_OneHanded':
            // 원거리 공격 시 무기 자세
            weapon.position.set(-0.01, 0.09, 0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0);
            break;

          case 'Idle':
          case 'Walk':
          case 'Run':
            // 평상시 자세: 무기를 옆으로 들고 있음
            weapon.position.set(-0.01, 0.09, 0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0); // 옆으로 향함
            break;

          default:
            // 기타 애니메이션(점프, 구르기 등)에서도 평상시 자세 유지
            weapon.position.set(-0.01, 0.09, 0.1);
            weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0);
            break;
        }
      }
      // --- 무기 자세 제어 로직 끝 ---

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
        const slashMove = this.attackDirection_.clone().multiplyScalar(this.attackSpeed_ * timeElapsed);
        this.position_.add(slashMove);

        // 무기 회전 로직 - 근접 공격과 원거리 공격 모두 처리
        if (this.equippedWeapon_ && this.equippedWeapon_.model_ && this.currentAction_) {
            const currentAnimationName = this.currentAction_._clip.name;
            if (currentAnimationName === 'SwordSlash' || currentAnimationName === 'Shoot_OneHanded') {
                const weapon = this.equippedWeapon_.model_;
                const currentAnimationTime = this.currentAction_.time;
                const currentFrame = currentAnimationTime * 24; // 24 FPS 가정

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

                // 실제 공격 판정 및 피해 적용
                if (this.canDamage_ && !this.attackedThisFrame_) {
                    // 플레이어의 위치와 방향을 기반으로 공격 범위 정의
                    const playerPosition = this.mesh_.position;
                    const playerDirection = new THREE.Vector3();
                    this.mesh_.getWorldDirection(playerDirection);
                    playerDirection.y = 0; // Y축은 고려하지 않음
                    playerDirection.normalize();

                    // NPC 목록 순회 (this.params_.npcs가 존재한다고 가정)
                    if (this.params_.npcs) {
                        this.params_.npcs.forEach(npc => {
                            if (npc.model_ && !npc.isDead_) { // NPC가 존재하고 죽지 않았다면
                                const npcPosition = npc.model_.position;
                                const distance = playerPosition.distanceTo(npcPosition);

                                // 공격 반경 내에 있는지 확인
                                if (distance <= this.currentAttackRadius) {
                                    const directionToNpc = npcPosition.clone().sub(playerPosition).normalize();
                                    const angle = playerDirection.angleTo(directionToNpc);

                                    // 공격 각도 내에 있는지 확인
                                    if (angle <= this.currentAttackAngle / 2) { // 각도는 중심에서 양쪽으로 퍼지므로 절반
                                        // 이미 피해를 입은 적이 아니라면
                                        if (!this.hitEnemies_.has(npc)) {
                                            // NPC에게 피해 적용
                                            npc.TakeDamage(this.currentAttackDamage);
                                            this.hitEnemies_.add(npc); // 피해를 입힌 적 추가
                                            this.attackedThisFrame_ = true; // 한 프레임에 한 번만 공격하도록 설정
                                        }
                                    }
                                }
                            }
                        });
                    }
                }

                // 무기 회전 로직 (근접 공격과 원거리 공격 모두)
                if (currentAnimationName === 'SwordSlash') {
                    let targetRotationX = Math.PI / 2; // 기본 수평
                    let targetRotationY = Math.PI / 2; // 기본 Y축 회전
                    let targetRotationZ = 0; // 기본 Z축 회전
                    
                    // 공격 구간별 무기 회전 조정
                    if (currentFrame >= 11 && currentFrame <= 21) {
                        // 11 ~ 21 프레임: 0에서 90도(π/2)까지 선형 증가
                        const progress = (currentFrame - 11) / 10;
                        targetRotationX = progress * (Math.PI / 2);
                        targetRotationY = Math.PI / 2;
                        targetRotationZ = 0;
                    } else if (currentFrame === 22) {
                        // 22 프레임: 60도(π/3)
                        targetRotationX = Math.PI / 3;
                        targetRotationY = Math.PI / 2;
                        targetRotationZ = 0;
                    } else if (currentFrame === 23) {
                        // 23 프레임: 30도(π/6)
                        targetRotationX = Math.PI / 6;
                        targetRotationY = Math.PI / 2;
                        targetRotationZ = 0;
                    } else if (currentFrame === 24) {
                        // 24 프레임: 0도
                        targetRotationX = 0;
                        targetRotationY = Math.PI / 2;
                        targetRotationZ = 0;
                    } else {
                        // 기본 자세 (11-24프레임이 아닐 때)
                        targetRotationX = Math.PI / 2;
                        targetRotationY = Math.PI / 2;
                        targetRotationZ = 0;
                    }
                    weapon.rotation.set(targetRotationX, targetRotationY, targetRotationZ);
                } else if (currentAnimationName === 'Shoot_OneHanded') {
                    // 원거리 공격 시 무기 회전 없음 - 고정 자세 유지
                    weapon.rotation.set(Math.PI / 2, Math.PI / 2, 0); // 기본 자세 유지
                }
            }
        }

        if (this.attackTimer_ <= 0) {
            this.isAttacking_ = false;
            this.canDamage_ = false; // 공격 종료 시 canDamage_ 초기화
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
      } else if (this.isJumping_) {
          this.SetAnimation_('Jump');
      } else if (this.isPicking_) {
        this.SetAnimation_('PickUp');
      }
       else if (!this.isAttacking_) { // 공격 중이 아닐 때만 이동/대기 애니메이션 처리
          const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
          const isRunning = isMoving && this.keys_.shift;
          if (isMoving) {
              this.SetAnimation_(isRunning ? 'Run' : 'Walk');
          } else {
              this.SetAnimation_('Idle'); // 기본 모션
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
