// attackSystem.js
// 공격 애니메이션 타격 타이밍에서 meleeProjectile 생성 트리거
import { MeleeProjectile } from './meleeProjectile.js';

export class AttackSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
  }

  // 공격 애니메이션의 타격 프레임에서 호출
  spawnMeleeProjectile({
    position, // THREE.Vector3 (무기 끝 위치)
    direction, // THREE.Vector3 (캐릭터 전방)
    weapon, // 무기 데이터 (공격력, 사거리 등)
    attacker, // 플레이어 또는 NPC
    onHit // (optional) 타격 시 콜백
  }) {
    const projectile = new MeleeProjectile({
      scene: this.scene,
      position,
      direction,
      weapon,
      attacker,
      onHit
    });
    this.projectiles.push(projectile);
    return projectile;
  }

  // 매 프레임마다 호출 (game loop에서)
  update(delta, npcs) {
    this.projectiles = this.projectiles.filter(p => !p.isDestroyed);
    for (const projectile of this.projectiles) {
      projectile.update(delta, npcs);
    }
  }
} 