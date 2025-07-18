import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/FBXLoader.js';
import { WEAPON_DATA, WeaponFactory } from '../weapon_system.js';

export class Item {
  constructor(scene, itemName, position = new THREE.Vector3(0, 0, 0), type = 'melee', subtype = null, attackRadius = 1.0, attackAngle = Math.PI / 2, damage = 10, attackSpeedMultiplier = 1.0, attackType = 'single', specialEffect = null, statEffect = null) {
    this.itemName = itemName; // Store item name
    this.scene_ = scene;
    this.model_ = null; // 모델을 저장할 속성 추가
    this.rangeIndicator_ = null; // 범위 표시 원 추가
    this.type = type;
    this.subtype = subtype;
    this.attackRadius = attackRadius;
    this.attackAngle = attackAngle;
    this.damage = damage;
    this.attackSpeedMultiplier = attackSpeedMultiplier;
    this.attackType = attackType;
    this.specialEffect = specialEffect; // New property
    this.statEffect = statEffect; // New property
    
    // 새로운 무기 시스템 데이터로 업데이트
    this.updateFromWeaponSystem();
    
    this.LoadModel_(itemName, position);
    this.CreateRangeIndicator_();
  }

  // 새로운 무기 시스템에서 데이터 가져오기
  updateFromWeaponSystem() {
    const weaponData = WEAPON_DATA[this.itemName];
    if (weaponData) {
      this.type = weaponData.type;
      this.subtype = weaponData.subtype; // subtype 추가
      this.attackRadius = weaponData.radius;
      this.attackAngle = weaponData.angle;
      this.damage = weaponData.damage;
      this.attackSpeedMultiplier = weaponData.attackSpeedMultiplier;
      this.attackType = weaponData.attackType;
      this.specialEffect = weaponData.specialEffect;
      this.statEffect = weaponData.statEffect;
    }
  }

  LoadModel_(itemName, position) {
    const loader = new FBXLoader();
    loader.setPath('./resources/weapon/FBX/'); // 무기/도구 FBX는 여기에 있다고 가정
    loader.load(itemName, (fbx) => {
      const model = fbx;
      // 총(weapon/gun)일 경우 스케일 0.5배 적용
      if (/AssaultRifle|Pistol|Shotgun|SniperRifle|SubmachineGun/i.test(itemName)) {
        model.scale.setScalar(0.005); // 기존 0.01의 0.5배
      } else {
        model.scale.setScalar(0.01);
      }
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
    
    // 여기에 도구별 사용 로직 추가
  }
}