// map.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

export const MAP_BOUNDS = {
  minX: -40,
  maxX: 40,
  minZ: -40,
  maxZ: 40,
  minY: 0,
  fallY: -10,
};

export const RESPAWN_POSITION = new THREE.Vector3(0, MAP_BOUNDS.minY, 0);
export const FALL_DAMAGE = 35;
export const FALL_DAMAGE_INTERVAL = 0.3;

export function isOutOfBounds(pos) {
  return (
    pos.x < MAP_BOUNDS.minX || pos.x > MAP_BOUNDS.maxX ||
    pos.z < MAP_BOUNDS.minZ || pos.z > MAP_BOUNDS.maxZ
  );
}

export function isBelowFloor(pos) {
  return pos.y < MAP_BOUNDS.minY - 0.1;
}

export function isBelowFallY(pos) {
  return pos.y < MAP_BOUNDS.fallY;
}

/**
 * 낙사 상황에서 HP 감소 및 모션 처리
 * @param {Player} player - 플레이어 인스턴스
 * @param {number} timeElapsed - 프레임 시간
 */
export function handleFalling(player, timeElapsed) {
  const outOfBounds = isOutOfBounds(player.position_);
  const belowFloor = isBelowFloor(player.position_);
  const belowFallY = isBelowFallY(player.position_);

  // 죽은 상태에서는 낙사 처리하지 않음
  if (player.isDead_) return false;

  if (outOfBounds || belowFloor || belowFallY) {
    // y축 낙하 처리 (떨어지는 속도 느리게)
    if (outOfBounds) {
      player.position_.y += player.gravity_ * timeElapsed * 0.7;
    } else if (belowFloor) {
      player.velocityY_ += player.gravity_ * timeElapsed * 0.7;
      player.position_.y += player.velocityY_ * timeElapsed;
    }

    // 일정 간격마다 HP 감소 (fallY 이하이거나 경계 밖일 때만)
    if (belowFallY || outOfBounds) {
      player.fallDamageTimer_ -= timeElapsed;
      if (player.fallDamageTimer_ <= 0) {
        if (player.TakeDamage) player.TakeDamage(FALL_DAMAGE);
        player.fallDamageTimer_ = FALL_DAMAGE_INTERVAL;
      }
    }
    return true;
  } else {
    player.fallDamageTimer_ = 0;
    return false;
  }
}
