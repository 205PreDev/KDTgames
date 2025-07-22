// networkSync.js
// 고급 게임 시스템(무기, 공격, 이펙트)의 네트워크 동기화 구현

import { createMuzzleFlashEffect } from './effects.js';

/**
 * 네트워크 동기화 시스템 클래스
 * 플레이어 간 게임 상태 실시간 동기화 및 서버-클라이언트 간 데이터 일관성 보장
 */
export class NetworkSyncSystem {
  constructor(socket, roomId) {
    this.socket = socket;
    this.roomId = roomId;
    this.players = new Map(); // 플레이어 ID를 키로 하는 플레이어 객체 맵
    this.localPlayer = null; // 로컬 플레이어 참조
    this.scene = null; // Three.js 씬 참조
    this.lastSyncTime = 0; // 마지막 동기화 시간
    this.syncInterval = 50; // 동기화 간격 (ms)
    this.eventListeners = []; // 이벤트 리스너 배열 (정리를 위해)
    this.pendingEvents = []; // 처리 대기 중인 이벤트 큐
    this.syncEnabled = true; // 동기화 활성화 상태
    
    // 동기화 데이터 버퍼 (최적화를 위해)
    this.positionBuffer = new Float32Array(3);
    this.rotationBuffer = new Float32Array(3);
  }

  /**
   * 네트워크 동기화 시스템 초기화
   * @param {Object} scene - Three.js 씬 객체
   * @param {Object} localPlayer - 로컬 플레이어 객체
   */
  initialize(scene, localPlayer) {
    this.scene = scene;
    this.localPlayer = localPlayer;
    this.setupEventListeners();
    
    console.log('네트워크 동기화 시스템 초기화 완료');
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.socket) {
      console.error('소켓이 초기화되지 않았습니다.');
      return;
    }

    // 게임 업데이트 이벤트 리스너
    const gameUpdateListener = (data) => {
      this.handleGameUpdate(data);
    };
    this.socket.on('gameUpdate', gameUpdateListener);
    this.eventListeners.push({ event: 'gameUpdate', handler: gameUpdateListener });
    
    console.log('네트워크 이벤트 리스너 설정 완료');
  }

  /**
   * 플레이어 추가
   * @param {string} playerId - 플레이어 ID
   * @param {Object} playerObject - 플레이어 객체
   */
  addPlayer(playerId, playerObject) {
    this.players.set(playerId, playerObject);
    console.log(`플레이어 추가: ${playerId}`);
  }

  /**
   * 플레이어 제거
   * @param {string} playerId - 플레이어 ID
   */
  removePlayer(playerId) {
    this.players.delete(playerId);
    console.log(`플레이어 제거: ${playerId}`);
  }

  /**
   * 게임 업데이트 이벤트 처리
   * @param {Object} data - 업데이트 데이터
   */
  handleGameUpdate(data) {
    // 이벤트 큐에 추가
    this.pendingEvents.push(data);
  }

  /**
   * 대기 중인 이벤트 처리
   */
  processPendingEvents() {
    while (this.pendingEvents.length > 0) {
      const event = this.pendingEvents.shift();
      this.processEvent(event);
    }
  }

  /**
   * 개별 이벤트 처리
   * @param {Object} event - 처리할 이벤트
   */
  processEvent(event) {
    switch (event.type) {
      case 'playerState':
        this.updatePlayerState(event.data);
        break;
      case 'weaponAttack':
        this.handleWeaponAttack(event.data);
        break;
      case 'projectile':
        this.handleProjectile(event.data);
        break;
      case 'effect':
        this.handleEffect(event.data);
        break;
      case 'itemPickup':
        this.handleItemPickup(event.data);
        break;
      case 'damage':
        this.handleDamage(event.data);
        break;
      default:
        console.warn(`알 수 없는 이벤트 타입: ${event.type}`);
    }
  }

  /**
   * 플레이어 상태 업데이트
   * @param {Object} stateData - 플레이어 상태 데이터
   */
  updatePlayerState(stateData) {
    const playerId = stateData.id;
    const player = this.players.get(playerId);
    
    if (!player) {
      console.warn(`존재하지 않는 플레이어 ID: ${playerId}`);
      return;
    }
    
    // 원격 플레이어 상태 업데이트
    if (player.isRemote && typeof player.UpdateRemoteState === 'function') {
      player.UpdateRemoteState(stateData);
    }
  }

  /**
   * 무기 공격 이벤트 처리
   * @param {Object} attackData - 공격 데이터
   */
  handleWeaponAttack(attackData) {
    const { playerId, weaponType, position, direction, attackType } = attackData;
    const player = this.players.get(playerId);
    
    if (!player) return;
    
    // 원격 플레이어의 공격 애니메이션 재생
    if (attackType === 'melee') {
      player.SetAnimation_('SwordSlash');
    } else if (attackType === 'ranged') {
      player.SetAnimation_('Shoot_OneHanded');
      
      // 원거리 공격 시 총구 화염 효과 생성
      if (player.mesh_ && this.scene) {
        createMuzzleFlashEffect(player, this.scene);
      }
    }
  }

  /**
   * 투사체 이벤트 처리
   * @param {Object} projectileData - 투사체 데이터
   */
  handleProjectile(projectileData) {
    const { playerId, projectileId, position, direction, weaponData, type } = projectileData;
    const player = this.players.get(playerId);
    
    if (!player || !player.attackSystem) return;
    
    // 투사체 생성
    player.attackSystem.spawnMeleeProjectile({
      position: new THREE.Vector3(position[0], position[1], position[2]),
      direction: new THREE.Vector3(direction[0], direction[1], direction[2]),
      weapon: weaponData,
      attacker: player,
      type: type || 'circle',
      angle: weaponData.attackAngle || Math.PI / 2,
      radius: weaponData.attackRadius || 1.5
    });
  }

  /**
   * 이펙트 이벤트 처리
   * @param {Object} effectData - 이펙트 데이터
   */
  handleEffect(effectData) {
    const { type, position, data } = effectData;
    
    // 이펙트 타입에 따라 처리
    switch (type) {
      case 'muzzleFlash':
        // 총구 화염 효과 처리
        break;
      case 'explosion':
        // 폭발 효과 처리
        break;
      case 'impact':
        // 충돌 효과 처리
        break;
    }
  }

  /**
   * 아이템 획득 이벤트 처리
   * @param {Object} itemData - 아이템 데이터
   */
  handleItemPickup(itemData) {
    const { playerId, itemId, itemType } = itemData;
    const player = this.players.get(playerId);
    
    if (!player) return;
    
    // 아이템 획득 처리
    // 맵에서 아이템 제거 및 플레이어에게 장착
  }

  /**
   * 데미지 이벤트 처리
   * @param {Object} damageData - 데미지 데이터
   */
  handleDamage(damageData) {
    const { targetId, amount, attackerId } = damageData;
    const target = this.players.get(targetId);
    
    if (!target) return;
    
    // 데미지 적용
    if (typeof target.TakeDamage === 'function') {
      target.TakeDamage(amount);
    }
  }

  /**
   * 로컬 플레이어 상태 동기화
   */
  syncLocalPlayerState() {
    if (!this.localPlayer || !this.socket || !this.syncEnabled) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastSyncTime < this.syncInterval) return;
    
    this.lastSyncTime = currentTime;
    
    // 플레이어 상태 데이터 구성
    const playerState = {
      id: this.socket.id,
      position: [
        this.localPlayer.position_.x,
        this.localPlayer.position_.y,
        this.localPlayer.position_.z
      ],
      rotation: [
        this.localPlayer.mesh_ ? this.localPlayer.mesh_.rotation.x : 0,
        this.localPlayer.mesh_ ? this.localPlayer.mesh_.rotation.y : 0,
        this.localPlayer.mesh_ ? this.localPlayer.mesh_.rotation.z : 0
      ],
      animation: this.localPlayer.currentAnimationName_,
      hp: this.localPlayer.hp_,
      isDead: this.localPlayer.isDead_,
      isAttacking: this.localPlayer.isAttacking_,
      isRolling: this.localPlayer.isRolling_,
      isJumping: this.localPlayer.isJumping_,
      isHit: this.localPlayer.isHit_,
      weapon: this.localPlayer.equippedWeapon_ ? {
        type: this.localPlayer.equippedWeapon_.type,
        name: this.localPlayer.equippedWeapon_.name || this.localPlayer.equippedWeapon_.itemName
      } : null
    };
    
    // 소켓을 통해 상태 전송
    this.socket.emit('gameUpdate', {
      type: 'playerState',
      data: playerState
    });
  }

  /**
   * 무기 공격 동기화
   * @param {Object} attackData - 공격 데이터
   */
  syncWeaponAttack(attackData) {
    if (!this.socket || !this.syncEnabled) return;
    
    this.socket.emit('gameUpdate', {
      type: 'weaponAttack',
      data: attackData
    });
  }

  /**
   * 투사체 동기화
   * @param {Object} projectileData - 투사체 데이터
   */
  syncProjectile(projectileData) {
    if (!this.socket || !this.syncEnabled) return;
    
    this.socket.emit('gameUpdate', {
      type: 'projectile',
      data: projectileData
    });
  }

  /**
   * 이펙트 동기화
   * @param {Object} effectData - 이펙트 데이터
   */
  syncEffect(effectData) {
    if (!this.socket || !this.syncEnabled) return;
    
    this.socket.emit('gameUpdate', {
      type: 'effect',
      data: effectData
    });
  }

  /**
   * 아이템 획득 동기화
   * @param {Object} itemData - 아이템 데이터
   */
  syncItemPickup(itemData) {
    if (!this.socket || !this.syncEnabled) return;
    
    this.socket.emit('gameUpdate', {
      type: 'itemPickup',
      data: itemData
    });
  }

  /**
   * 데미지 동기화
   * @param {Object} damageData - 데미지 데이터
   */
  syncDamage(damageData) {
    if (!this.socket || !this.syncEnabled) return;
    
    this.socket.emit('gameUpdate', {
      type: 'damage',
      data: damageData
    });
  }

  /**
   * 업데이트 메서드 (게임 루프에서 호출)
   * @param {number} deltaTime - 델타 시간 (초)
   */
  update(deltaTime) {
    // 대기 중인 이벤트 처리
    this.processPendingEvents();
    
    // 로컬 플레이어 상태 동기화
    this.syncLocalPlayerState();
  }

  /**
   * 네트워크 동기화 활성화/비활성화
   * @param {boolean} enabled - 활성화 여부
   */
  setEnabled(enabled) {
    this.syncEnabled = enabled;
  }

  /**
   * 리소스 정리
   */
  dispose() {
    // 이벤트 리스너 제거
    if (this.socket) {
      this.eventListeners.forEach(({ event, handler }) => {
        this.socket.off(event, handler);
      });
    }
    
    this.eventListeners = [];
    this.players.clear();
    this.localPlayer = null;
    this.scene = null;
    
    console.log('네트워크 동기화 시스템 정리 완료');
  }
}