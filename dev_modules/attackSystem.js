// attackSystem.js
// 공격 애니메이션 타격 타이밍에서 meleeProjectile 생성 트리거
import { MeleeProjectile } from './meleeProjectile.js';

export class AttackSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.projectilePool = [];
  }

  // 풀에서 투사체 가져오기 또는 새로 생성
  getProjectile(params) {
    let projectile = null;
    if (this.projectilePool.length > 0) {
      projectile = this.projectilePool.pop();
      // 재사용 시 속성 재설정
      projectile.scene = this.scene;
      projectile.position.copy(params.position);
      projectile.direction.copy(params.direction);
      projectile.weapon = params.weapon;
      projectile.attacker = params.attacker;
      projectile.onHit = params.onHit;
      projectile.type = params.type;
      projectile.angle = params.angle;
      projectile.radius = params.radius;
      projectile.traveled = 0;
      projectile.isDestroyed = false;
      projectile.projectileEffect = params.weapon.projectileEffect || null;
      // 기타 속성도 필요시 재설정
    } else {
      projectile = new MeleeProjectile(params);
    }
    // destroy 시 풀로 반환하도록 콜백 연결
    const originalDestroy = projectile.destroy.bind(projectile);
    projectile.destroy = () => {
      if (!projectile.isDestroyed) {
        originalDestroy();
        this.projectilePool.push(projectile);
      }
    };
    return projectile;
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
    const params = {
      scene: this.scene,
      position,
      direction,
      weapon,
      attacker,
      onHit,
      type,
      angle,
      radius
    };
    const projectile = this.getProjectile(params);
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