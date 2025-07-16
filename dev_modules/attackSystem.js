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
      projectile.scene = params.scene; // scene도 재설정
      projectile.position.copy(params.position);
      projectile.direction.copy(params.direction);
      projectile.weapon = params.weapon;
      projectile.attacker = params.attacker;
      projectile.onHit = params.onHit;
      projectile.type = params.type;
      projectile.angle = params.angle;
      projectile.radius = params.radius;
      projectile.speed = (params.speed !== undefined) ? params.speed : (params.weapon.projectileSpeed !== undefined ? params.weapon.projectileSpeed : 20); // speed도 재설정
      projectile.range = params.weapon.range || params.weapon.attackRadius || 2.0; // range도 재설정
      projectile.traveled = 0;
      projectile.isDestroyed = false;
      projectile.projectileEffect = params.weapon.projectileEffect || null;
      // debugMesh를 항상 다시 생성하거나 업데이트
      if (projectile.debugMesh) {
        projectile.scene.remove(projectile.debugMesh); // 이전 메쉬 제거
      }
      projectile.debugMesh = projectile.createDebugMesh(); // 새롭게 생성
      if (projectile.debugMesh && projectile.scene) projectile.scene.add(projectile.debugMesh);
    } else {
      projectile = new MeleeProjectile(params);
    }
    // destroy 시 풀로 반환하도록 콜백 연결
    const originalDestroy = projectile.destroy.bind(projectile);
    projectile.destroy = () => {
      if (!projectile.isDestroyed) {
        // debugMesh를 씬에서 제거하고 null로 설정하는 대신, 풀로 반환될 때만 제거
        if (projectile.debugMesh && projectile.scene) {
            projectile.scene.remove(projectile.debugMesh);
            projectile.debugMesh = null; // 풀로 반환될 때 완전히 제거
        }
        originalDestroy(); // 원래 destroy 로직 호출 (isDestroyed = true 설정 등)
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