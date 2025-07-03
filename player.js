import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

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
            this.keys_ = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                shift: false, // Shift 키 추가
            };

            this.LoadModel_();
            this.InitInput_();
        }

        InitInput_() {
            window.addEventListener('keydown', (e) => this.OnKeyDown_(e), false);
            window.addEventListener('keyup', (e) => this.OnKeyUp_(e), false);
        }

        OnKeyDown_(event) {
            switch (event.code) {
                case 'KeyW': this.keys_.forward = true; break;
                case 'KeyS': this.keys_.backward = true; break;
                case 'KeyA': this.keys_.left = true; break;
                case 'KeyD': this.keys_.right = true; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys_.shift = true; break;
            }
        }

        OnKeyUp_(event) {
            switch (event.code) {
                case 'KeyW': this.keys_.forward = false; break;
                case 'KeyS': this.keys_.backward = false; break;
                case 'KeyA': this.keys_.left = false; break;
                case 'KeyD': this.keys_.right = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys_.shift = false; break;
            }
        }

        LoadModel_() {
            const loader = new GLTFLoader();
            loader.setPath('./resources/Ultimate Animated Character Pack - Nov 2019/glTF/');
            loader.load('BaseCharacter.gltf', (gltf) => {
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
                console.log("애니메이션 목록:", Object.keys(this.animations_));
            });
        }

        SetAnimation_(name) {
            if (this.currentAction_ === this.animations_[name]) return;

            if (this.currentAction_) {
                this.currentAction_.fadeOut(0.3);
            }
            this.currentAction_ = this.animations_[name];
            if (this.currentAction_) {
                this.currentAction_.reset().fadeIn(0.3).play();
            }
        }

        Update(timeElapsed, rotationAngle = 0) {
            if (!this.mesh_) return;

            const velocity = new THREE.Vector3();
            const forward = new THREE.Vector3(0, 0, -1);
            const right = new THREE.Vector3(1, 0, 0);

            if (this.keys_.forward) velocity.add(forward);
            if (this.keys_.backward) velocity.sub(forward);
            if (this.keys_.left) velocity.sub(right);
            if (this.keys_.right) velocity.add(right);

            // 방향 회전 적용
            velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);

            const isMoving = this.keys_.forward || this.keys_.backward || this.keys_.left || this.keys_.right;
            const isRunning = isMoving && this.keys_.shift;
            const moveSpeed = isRunning ? this.speed_ * 2 : this.speed_;

            velocity.normalize().multiplyScalar(moveSpeed * timeElapsed);
            this.position_.add(velocity);

            if (velocity.length() > 0.01) {
                this.SetAnimation_(isRunning ? 'Run' : 'Walk');

                const angle = Math.atan2(velocity.x, velocity.z);
                const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0), angle
                );
                this.mesh_.quaternion.slerp(targetQuaternion, 0.1);
            } else {
                this.SetAnimation_('Idle');
            }

            this.mesh_.position.copy(this.position_);

            if (this.mixer_) {
                this.mixer_.update(timeElapsed);
            }
        }

    }

    return {
        Player: Player,
    };
})();
