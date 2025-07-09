import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/FBXLoader.js';

export class Item {
  constructor(scene, itemName, position = new THREE.Vector3(0, 0, 0), type = 'melee', attackRadius = 1.0, attackAngle = Math.PI / 2, damage = 10, attackSpeedMultiplier = 1.0, attackType = 'single', specialEffect = null) {
    this.itemName = itemName; // Store item name
    this.scene_ = scene;
    this.model_ = null; // 모델을 저장할 속성 추가
    this.rangeIndicator_ = null; // 범위 표시 원 추가
    this.type = type;
    this.attackRadius = attackRadius;
    this.attackAngle = attackAngle;
    this.damage = damage;
    this.attackSpeedMultiplier = attackSpeedMultiplier;
    this.attackType = attackType;
    this.specialEffect = specialEffect;
    this.LoadModel_(itemName, position);
    this.CreateRangeIndicator_();
  }

  LoadModel_(itemName, position) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapon/FBX/'); // 무기/도구 FBX는 여기에 있다고 가정
    loader.load(itemName, (fbx) => {
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

  // 도구 기능을 위한 플레이스홀더
  use(player) {
    console.log(`${this.itemName} used by ${player.name}`);
    // 여기에 도구별 사용 로직 추가
  }
}