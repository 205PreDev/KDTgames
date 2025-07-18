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
    onHit, // (optional) 타격 시 콜백
    type = 'circle', // 'sector' 또는 'circle'
    angle = Math.PI / 2, // 부채꼴 각도(라디안)
    radius = 3 // 판정 반경
  }) {
    const projectile = new MeleeProjectile({
      scene: this.scene,
      position,
      direction,
      weapon,
      attacker,
      onHit,
      type,
      angle,
      radius
    });
    this.projectiles.push(projectile);
    return projectile;
  }

  // 공중 공격용 히트박스 생성 함수
  createAerialAttackHitbox(player) {
    const position = player.mesh_.position.clone();
    position.y += 1.0;
    const direction = player.attackDirection_.clone();
    const weapon = player.equippedWeapon_ || { damage: player.currentAttackDamage, range: player.currentAttackRadius, type: 'melee', attackRadius: 1.5, attackAngle: Math.PI / 2 };
    const attacker = player;
    // 무기 타입에 따라 MeleeProjectile의 type, angle, radius 설정
    let projectileType = 'sector';
    let projectileAngle = weapon.attackAngle || Math.PI / 2;
    let projectileRadius = weapon.attackRadius || 1.5;
    if (weapon.type === 'ranged') {
      projectileType = 'circle';
      projectileAngle = 0;
      projectileRadius = weapon.range || 0.5;
    }
    const projectile = new MeleeProjectile({
      scene: this.scene,
      position,
      direction,
      weapon,
      attacker,
      type: projectileType,
      angle: projectileAngle,
      radius: projectileRadius
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