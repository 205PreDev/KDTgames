// meleeProjectile.js
// 근접 무기용 보이지 않는 투사체(hitbox) 클래스
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

export class MeleeProjectile {
  constructor({ scene, position, direction, weapon, attacker, onHit }) {
    this.scene = scene;
    this.position = position.clone();
    this.direction = direction.clone().normalize();
    this.weapon = weapon;
    this.attacker = attacker;
    this.onHit = onHit;
    this.speed = 20; // 매우 빠른 속도 (짧은 시간 이동)
    this.range = weapon.range || weapon.attackRadius || 2.0;
    this.traveled = 0;
    this.radius = 3; // 판정 hitbox 반경 (무기 크기에 따라 조정)
    this.isDestroyed = false;
    // 시각화 필요시 아래 주석 해제
    // this.debugMesh = this.createDebugMesh();
    // if (this.debugMesh) scene.add(this.debugMesh);
  }

  // (선택) 시각화용 디버그 메쉬
  createDebugMesh() {
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }

  update(delta, npcs) {
    if (this.isDestroyed) return;
    const moveDist = this.speed * delta;
    this.position.addScaledVector(this.direction, moveDist);
    this.traveled += moveDist;
    // if (this.debugMesh) this.debugMesh.position.copy(this.position);

    // 충돌 판정 (npcs 배열 순회)
    for (const npc of npcs) {
      if (npc.model_ && typeof npc.TakeDamage === 'function') {
        // NPC가 피해를 받을 수 있는 상태인지 확인
        const canNpcTakeDamage = typeof npc.canTakeDamage === 'function' ? npc.canTakeDamage() : !npc.isDead_;

        if (canNpcTakeDamage) {
          const npcPos = npc.model_.position;
          const dist = this.position.distanceTo(npcPos);
          if (dist <= this.radius + (npc.hitRadius || 0.7)) {
            // 타격 성공
            npc.TakeDamage(this.weapon.damage);
            if (this.attacker && this.attacker.hitEnemies_) { this.attacker.hitEnemies_.add(npc); }
            if (this.onHit) this.onHit(npc);
            this.destroy();
            return;
          }
        }
      }
    }
    // 사거리 초과 시 소멸
    if (this.traveled >= this.range) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.isDestroyed) {
      // === 디버그용 흔적 남기기 ===
      if (this.scene) {
        const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.5 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(this.position);
        this.scene.add(marker);
        setTimeout(() => {
          if (marker.parent) marker.parent.remove(marker);
        }, 1000); // 1초 후 자동 삭제
      }
      // ===
    }
    this.isDestroyed = true;
    // if (this.debugMesh && this.scene) this.scene.remove(this.debugMesh);
  }
} 