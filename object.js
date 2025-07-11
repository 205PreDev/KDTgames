// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import * as map from './map.js'; // map.js import

export const object = (() => {

  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), name = 'NPC') {
      console.log('NPC constructor called for:', name); // 추가
      this.scene_ = scene;
      this.model_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.maxHealth_ = 150; // NPC 최대 체력
      this.health_ = this.maxHealth_; // NPC 체력
      this.name_ = name;
      this.isAttacking_ = false;
      this.canDamage_ = false;
      this.attackCooldown_ = 2.0; // 공격 쿨타임
      this.attackCooldownTimer_ = 0;
      this.headBone = null;
      this.attackAngle_ = Math.PI / 1.5; // NPC 공격 부채꼴 각도 (120도)
      this.isCurrentAnimationAttack_ = false; // 현재 애니메이션이 공격 애니메이션인지 여부
      this.isDead_ = false; // NPC 사망 여부
      this.respawnTimer_ = 0; // 부활 타이머
      this.LoadModel_(position);
    }

    TakeDamage(damage) {
      const oldHealth = this.health_;
      this.health_ -= damage;
      if (this.health_ < 0) {
        this.health_ = 0;
      }
      console.log(`NPC took ${damage} damage. Health changed from ${oldHealth} to ${this.health_}.`);
      if (this.health_ <= 0) {
        this.health_ = 0;
        this.isDead_ = true;
        this.respawnTimer_ = 5.0; // 5초 후 부활
        this.SetAnimation_('Death'); // NPC 사망 애니메이션
      } else {
        this.SetAnimation_('ReceiveHit'); // 피해를 입었을 때 ReceiveHit 애니메이션 호출
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
          // 공격 애니메이션이 끝나면 상태 초기화
          if (this.isCurrentAnimationAttack_) {
            this.isAttacking_ = false;
            this.canDamage_ = false;
            this.SetAnimation_('Idle');
          } else if (e.action.getClip().name === 'ReceiveHit') {
            if (!this.isDead_) {
              this.SetAnimation_('Idle');
            }
          } 
        });

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
      }, undefined, (error) => {
        console.error("Error loading NPC model:", error); // 추가
      });
    }

    Respawn_() {
      this.health_ = this.maxHealth_;
      this.isDead_ = false;
      this.respawnTimer_ = 0;
      this.model_.visible = true; // 모델 다시 보이게

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
    }

    

    SetAnimation_(name) {
      // 'Attack' 애니메이션이 없을 경우, 'SwordSlash'로 대체 시도
      const animName = this.animations_[name] ? name : 'SwordSlash';
      if (!this.animations_[animName]) {
          console.warn(`NPC Animation ${name} (or SwordSlash) not found!`);
          return;
      }

      if (this.currentAction_ === this.animations_[animName]) return;

      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.2);
      }
      this.currentAction_ = this.animations_[animName];
      this.currentAction_.reset().fadeIn(0.2).play();

      // 현재 애니메이션이 공격 애니메이션인지 여부 설정
      this.isCurrentAnimationAttack_ = (name.includes('Attack') || name === 'SwordSlash');

      if (animName === 'SwordSlash') {
        this.currentAction_.setLoop(THREE.LoopOnce, 1);
        this.currentAction_.clampWhenFinished = true;
      } else if (name === 'Death') {
        this.currentAction_.setLoop(THREE.LoopOnce);
        this.currentAction_.clampWhenFinished = true;
      }
    }

    startAttack() {
      if (this.attackCooldownTimer_ > 0 || this.isAttacking_) {
        return;
      }
      this.isAttacking_ = true;
      this.canDamage_ = true;
      this.attackCooldownTimer_ = this.attackCooldown_;
      // 'Attack' 애니메이션 실행 (모델에 따라 이름이 다를 수 있음)
      this.SetAnimation_('SwordSlash');
    }

    Update(timeElapsed) {
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
      if (this.attackCooldownTimer_ > 0) {
        this.attackCooldownTimer_ -= timeElapsed;
      }
    }
  }

  return {
    NPC,
  };

})();
