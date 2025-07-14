// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import * as map from './map.js'; // map.js import

export const object = (() => {

  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), name = 'NPC') {
      this.scene_ = scene;
      this.model_ = null;
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
      this.LoadModel_(position);
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
      } else {
        // 피격 중에도 무적 없음: 항상 ReceiveHit 재생
        this.SetAnimation_('ReceiveHit');
        console.log(`NPC ${this.name_} took ${damage} damage. Health: ${oldHealth} → ${this.health_}`);
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
          // 애니메이션 완료 이벤트 처리
        });

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        console.log(`NPC ${this.name_} available animations:`, Object.keys(this.animations_));
        this.SetAnimation_('Idle');
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
      }
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
