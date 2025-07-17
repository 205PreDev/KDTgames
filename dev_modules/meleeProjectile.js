// meleeProjectile.js
// 근접 무기용 보이지 않는 투사체(hitbox) 클래스
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

export class MeleeProjectile {
  constructor({ scene, position, direction, weapon, attacker, onHit, type = 'circle', angle = Math.PI / 2, radius = 3, speed }) {
    this.scene = scene;
    this.position = position.clone();
    this.direction = direction.clone().normalize();
    this.weapon = weapon;
    this.attacker = attacker;
    this.onHit = onHit;
    this.speed = (speed !== undefined) ? speed : (weapon.projectileSpeed !== undefined ? weapon.projectileSpeed : 20);
    this.range = weapon.range || weapon.attackRadius || 2.0;
    this.traveled = 0;
    this.radius = (weapon.projectileSize !== undefined) ? weapon.projectileSize : (radius || weapon.radius || 3);
    this.angle = angle || weapon.angle || Math.PI / 2;
    this.type = type;
    this.isDestroyed = false;
    this.projectileEffect = weapon.projectileEffect || null;
    // 디버그 시각화: 항상 생성
    this.debugMesh = this.createDebugMesh();
    if (this.debugMesh && this.scene) this.scene.add(this.debugMesh);
  }

  createDebugMesh() {
    let color = 0xff0000;
    if (this.type === 'circle') {
      if (this.projectileEffect === 'piercing') color = 0x00ff00;
      else if (this.projectileEffect === 'explosion') color = 0x0000ff;
      else color = 0xffaa00;
    }
    // 투사체 모델을 BoxGeometry로 변경 (폭 0.5)
    const geometry = new THREE.BoxGeometry(0.1, 0.3, this.radius * 2); // 폭 0.5, 높이 0.5, 깊이는 radius의 2배로 설정

    // 텍스처 로드
    const textureLoader = new THREE.TextureLoader();
    const projectileTexture = textureLoader.load('./resources/backshot.png');

    const material = new THREE.MeshBasicMaterial({ map: projectileTexture, color, wireframe: false }); // wireframe 제거, 텍스처 적용
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);

    // 투사체 방향에 따라 메시 회전
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.direction); // 기본 Z축을 투사체 방향으로 정렬
    mesh.setRotationFromQuaternion(quaternion);

    return mesh;
  }

  // 부채꼴 판정 함수
  isInSector(targetPos) {
    const toTarget = targetPos.clone().sub(this.position);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist > this.radius) return false;
    const dirToTarget = toTarget.normalize();
    const dot = this.direction.dot(dirToTarget);
    const theta = Math.acos(dot); // 라디안
    return theta <= this.angle / 2;
  }

  update(delta, npcs) {
    if (this.isDestroyed) return;
    if (this.debugMesh) this.debugMesh.position.copy(this.position);
    if (this.type === 'sector' || this.type === 'aerial') {
      // sector(근접), aerial(공중) 공격은 이동하지 않고, 생성 프레임에만 판정 후 바로 소멸
      for (const npc of npcs) {
        if (npc.model_ && typeof npc.TakeDamage === 'function') {
          const canNpcTakeDamage = typeof npc.canTakeDamage === 'function' ? npc.canTakeDamage() : !npc.isDead_;
          if (canNpcTakeDamage) {
            const npcPos = npc.model_.position;
            if (this.isInSector(npcPos)) {
              npc.TakeDamage(this.weapon.damage);
              if (this.attacker && this.attacker.hitEnemies_) { this.attacker.hitEnemies_.add(npc); }
              if (this.onHit) this.onHit(npc);
              this.destroy();
              return;
            }
          }
        }
      }
      // sector, aerial 타입은 생성 프레임에만 존재
      this.destroy();
      return;
    }
    // 원거리(circle) 타입 이동 및 판정
    const moveDist = this.speed * delta;
    this.position.addScaledVector(this.direction, moveDist);
    this.traveled += moveDist;
    for (const npc of npcs) {
      if (npc.model_ && typeof npc.TakeDamage === 'function') {
        const canNpcTakeDamage = typeof npc.canTakeDamage === 'function' ? npc.canTakeDamage() : !npc.isDead_;
        if (canNpcTakeDamage) {
          const npcPos = npc.model_.position;
          let hit = false;
          if (this.type === 'circle') {
            const dist = this.position.distanceTo(npcPos);
            hit = dist <= this.radius + (npc.hitRadius || 0.7);
          }
          if (hit) {
            // projectileEffect 처리
            if (this.projectileEffect === 'piercing') {
              // 관통: 소멸하지 않고 다음 NPC도 타격
              npc.TakeDamage(this.weapon.damage);
              if (this.attacker && this.attacker.hitEnemies_) { this.attacker.hitEnemies_.add(npc); }
              if (this.onHit) this.onHit(npc);
              // 관통은 소멸하지 않음, 단 중복 타격 방지 필요시 별도 관리
            } else if (this.projectileEffect === 'explosion') {
              // 폭발: 주변 NPC 추가 타격(간단 예시)
              npc.TakeDamage(this.weapon.damage);
              if (this.attacker && this.attacker.hitEnemies_) { this.attacker.hitEnemies_.add(npc); }
              if (this.onHit) this.onHit(npc);
              this.explode(npcs);
              this.destroy();
              return;
            } else {
              // 일반: 1회 타격 후 소멸
              npc.TakeDamage(this.weapon.damage);
              if (this.attacker && this.attacker.hitEnemies_) { this.attacker.hitEnemies_.add(npc); }
              if (this.onHit) this.onHit(npc);
              this.destroy();
              return;
            }
          }
        }
      }
    }
    if (this.traveled >= this.range) {
      this.destroy();
    }
  }

  // 폭발 효과 예시
  explode(npcs) {
    const explosionRadius = this.radius * 2;
    for (const npc of npcs) {
      if (npc.model_ && typeof npc.TakeDamage === 'function') {
        const dist = this.position.distanceTo(npc.model_.position);
        if (dist <= explosionRadius) {
          npc.TakeDamage(this.weapon.damage * 0.5); // 폭발은 절반 피해
        }
      }
    }
    // 시각화: 폭발 이펙트 등 추가 가능
  }

  destroy() {
    if (!this.isDestroyed) {
      if (this.debugMesh && this.scene) {
        this.scene.remove(this.debugMesh);
        this.debugMesh = null;
      }
      // === 디버그용 흔적 남기기 ===
      if (this.scene) {
        const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.5 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(this.position);
        this.scene.add(marker);
        setTimeout(() => {
          if (marker.parent) marker.parent.remove(marker);
        }, 1000);
      }
    }
    this.isDestroyed = true;
  }
} 