import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/FBXLoader.js';

export class Weapon {
  constructor(scene, weaponName, position = new THREE.Vector3(0, 0, 0)) {
    this.scene_ = scene;
    this.model_ = null; // 모델을 저장할 속성 추가
    this.rangeIndicator_ = null; // 범위 표시 원 추가
    this.LoadModel_(weaponName, position);
    this.CreateRangeIndicator_();
  }

  LoadModel_(weaponName, position) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapon/FBX/');
    loader.load(weaponName, (fbx) => {
      const model = fbx;
      model.scale.setScalar(0.01);
      model.position.copy(position);

      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });

      this.scene_.add(model);
      this.model_ = model; // 로드된 모델을 this.model_에 저장
    });
  }

  CreateRangeIndicator_() {
      const geometry = new THREE.RingGeometry(1.8, 2, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      this.rangeIndicator_ = new THREE.Mesh(geometry, material);
      this.rangeIndicator_.rotation.x = -Math.PI / 2;
      this.rangeIndicator_.visible = false;
      this.scene_.add(this.rangeIndicator_);
  }

  ShowRangeIndicator() {
      if (this.model_ && this.rangeIndicator_) {
          this.rangeIndicator_.position.copy(this.model_.position);
          this.rangeIndicator_.visible = true;
      }
  }

  HideRangeIndicator() {
      if (this.rangeIndicator_) {
          this.rangeIndicator_.visible = false;
      }
  }
}