// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const object = (() => {

  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
      this.scene_ = scene;
      this.model_ = null;
      this.mixer_ = null;
      this.animations_ = {};
      this.currentAction_ = null;
      this.health_ = 150; // NPC 체력
      this.isAttacking_ = false;
      this.canDamage_ = false;
      this.attackCooldown_ = 2.0; // 공격 쿨타임
      this.attackCooldownTimer_ = 0;
      this.headBone = null;
      this.attackRangeIndicator_ = null;
      this.attackAngle_ = Math.PI / 1.5; // NPC 공격 부채꼴 각도 (120도)
      this.LoadModel_(position);
      this.CreateAttackRangeIndicator_();
    }

    TakeDamage(damage) {
      this.health_ -= damage;
      if (this.health_ < 0) {
        this.health_ = 0;
      }
      // TODO: Add death logic if health is 0
    }

    LoadModel_(position) {
      const loader = new GLTFLoader();
      loader.setPath('./resources/char/glTF/');
      // 공격 애니메이션이 있는 모델로 변경
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
          if (e.action.getClip().name.includes('Attack')) {
            this.isAttacking_ = false;
            this.canDamage_ = false;
            this.SetAnimation_('Idle');
            this.HideAttackRange_();
          }
        });

        for (const clip of gltf.animations) {
          this.animations_[clip.name] = this.mixer_.clipAction(clip);
        }
        this.SetAnimation_('Idle');
      });
    }

    CreateAttackRangeIndicator_() {
        const shape = new THREE.Shape();
        const radius = 2.5; // NPC 공격 범위 반지름
        const angle = Math.PI / 1.5; // 120도 부채꼴

        shape.moveTo(0, 0);
        shape.arc(0, 0, radius, -angle / 2, angle / 2, false);
        shape.lineTo(0, 0);

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.attackRangeIndicator_ = new THREE.Mesh(geometry, material);
        this.attackRangeIndicator_.rotation.x = -Math.PI / 2; // 바닥에 눕힘
        this.attackRangeIndicator_.visible = false; // 기본적으로 숨김
        this.scene_.add(this.attackRangeIndicator_);
    }

    ShowAttackRange_() {
        if (!this.attackRangeIndicator_ || !this.model_) return;

        this.attackRangeIndicator_.position.set(this.model_.position.x, 0.1, this.model_.position.z);
        this.attackRangeIndicator_.quaternion.copy(this.model_.quaternion);

        this.attackRangeIndicator_.visible = true;
    }

    HideAttackRange_() {
        if (this.attackRangeIndicator_) {
            this.attackRangeIndicator_.visible = false;
        }
    }

    SetAnimation_(name) {
      // 'Attack' 애니메이션이 없을 경우, 'SwordSlash'로 대체 시도
      const animName = this.animations_[name] ? name : 'SwordSlash';
      if (!this.animations_[animName]) {
          console.warn(`NPC Animation ${name} (or SwordSlash) not found!`);
          // 공격 애니메이션이 없으면 isAttacking 상태를 바로 false로 변경
          if(name.includes('Attack')) {
              this.isAttacking_ = false;
              this.canDamage_ = false;
          }
          return;
      }

      if (this.currentAction_ === this.animations_[animName]) return;

      if (this.currentAction_) {
        this.currentAction_.fadeOut(0.2);
      }
      this.currentAction_ = this.animations_[animName];
      this.currentAction_.reset().fadeIn(0.2).play();

      if (name.includes('Attack')) {
        this.currentAction_.setLoop(THREE.LoopOnce, 1);
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
      this.SetAnimation_('Attack');
      this.ShowAttackRange_();
    }

    Update(timeElapsed) {
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
