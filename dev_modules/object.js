// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';
import * as map from './map.js'; // map.js import

export const object = (() => {

  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), name = 'NPC', soundManager = null) {
      this.scene_ = scene;
      this.soundManager_ = soundManager; // SoundManager 인스턴스 추가
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
      } else {
        // 피격 중에도 무적 없음: 항상 ReceiveHit 재생
        this.SetAnimation_('ReceiveHit');
        if (this.soundManager_) {
          this.soundManager_.playSound('hit_impact');
        }
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
      } else if (name === 'Attack') { // NPC 공격 애니메이션 이름이 'Attack'이라고 가정
        this.currentAction_.setLoop(THREE.LoopOnce, 1);
        this.currentAction_.clampWhenFinished = true;
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
      if (this.debugHitboxMesh_ && this.model_) {
        this.debugHitboxMesh_.position.copy(this.model_.position);
        this.debugHitboxMesh_.position.y += this.hitboxHeight_ / 2;
        this.debugHitboxMesh_.visible = this.debugHitboxVisible_ && window.DEBUG_MODE_HITBOXES;
      }
    }
  }

  return {
    NPC,
  };
})();
