import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

// 총구 화염 이펙트 풀 관리 클래스
class MuzzleFlashPool {
    constructor(scene, poolSize = 5) {
        this.scene = scene;
        this.pool = [];
        this.activeFlashes = [];

        for (let i = 0; i < poolSize; i++) {
            const light = new THREE.PointLight(0xffcc00, 0.7, 5, 2); // 색상, 강도(0.5로 줄임), 거리(2로 줄임), 감쇠
            light.visible = false; // 초기에는 보이지 않게 설정
            light.userData.life = 0; // 이펙트 수명
            light.userData.duration = 100; // 이펙트 지속 시간 (ms)
            this.scene.add(light);
            this.pool.push(light);
        }
    }

    getFlash() {
        if (this.pool.length > 0) {
            const flash = this.pool.pop();
            flash.visible = true;
            flash.userData.life = flash.userData.duration; // 수명 초기화
            this.activeFlashes.push(flash);
            return flash;
        } else {
            // 풀이 비어있으면 새로 생성 (최대 개수 제한을 두는 것이 좋음)
            
            const light = new THREE.PointLight(0xffcc00, 0.5, 2, 2);
            light.userData.life = light.userData.duration; // 수명 초기화
            this.scene.add(light);
            this.activeFlashes.push(light);
            return light;
        }
    }

    returnFlash(flash) {
        flash.visible = false;
        const index = this.activeFlashes.indexOf(flash);
        if (index > -1) {
            this.activeFlashes.splice(index, 1);
        }
        this.pool.push(flash);
    }

    update(deltaTime) {
        for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
            const flash = this.activeFlashes[i];
            flash.userData.life -= deltaTime * 1000; // deltaTime은 초 단위이므로 ms로 변환
            if (flash.userData.life <= 0) {
                this.returnFlash(flash);
            }
        }
    }
}

let muzzleFlashPool = null; // 전역 풀 인스턴스

/**
 * 총구 화염 이펙트 풀을 초기화합니다.
 * @param {THREE.Scene} scene - 렌더링할 씬
 * @param {number} poolSize - 풀의 초기 크기
 */
function initMuzzleFlashPool(scene, poolSize = 5) {
    if (!muzzleFlashPool) {
        muzzleFlashPool = new MuzzleFlashPool(scene, poolSize);
    }
}

/**
 * 원거리 공격 시 총구 화염 효과를 생성합니다.
 * @param {THREE.Object3D} player - 플레이어 객체
 * @param {THREE.Scene} scene - 렌더링할 씬
 */
function createMuzzleFlashEffect(player, scene) {
    if (!player.equippedWeapon_ || !player.equippedWeapon_.model_) return;
    if (!muzzleFlashPool) {
        
        return;
    }

    const light = muzzleFlashPool.getFlash();
    if (!light) return; // 풀에서 빛을 가져오지 못하면 리턴

    // 무기 모델의 월드 포지션을 가져와서 빛의 위치로 설정
    const weaponPosition = new THREE.Vector3();
    player.equippedWeapon_.model_.getWorldPosition(weaponPosition);
    light.position.copy(weaponPosition);

    // 플레이어의 전방 방향으로 약간 이동시켜 총구 앞에 위치
    const forward = new THREE.Vector3();
    player.mesh_.getWorldDirection(forward);
    forward.multiplyScalar(0.3); // 총구 길이만큼 앞으로
    light.position.add(forward);

    // PointLight는 lookAt이 필요 없음
}

/**
 * 근접 공격 시각 효과(부채꼴)를 생성하고 짧은 시간 동안 보여줍니다.
 * @param {THREE.Object3D} player - 플레이어 객체
 * @param {THREE.Scene} scene - 렌더링할 씬
 */
function createMeleeSwingEffect(player, scene) {
    // 무기 데이터가 없으면 기본값 사용
    const attackAngle = player.equippedWeapon_?.attackAngle || (Math.PI / 4); // 기본값 변경 (45도)
    const attackRange = player.equippedWeapon_?.attackRadius || 1.5;

    // 부채꼴 모양의 Shape 생성
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, attackRange, -attackAngle / 2 * (Math.PI / 180), attackAngle / 2 * (Math.PI / 180), false);
    shape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,       // 노란색
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide // 양면 렌더링
    });
    const mesh = new THREE.Mesh(geometry, material);

    // 플레이어의 위치와 방향 복사
    if (!player || !player.position || !player.rotation) {
        
        geometry.dispose();
        material.dispose();
        return;
    }
    mesh.position.copy(player.position);
    mesh.rotation.copy(player.rotation);

    // 이펙트가 바닥에 평평하게 놓이도록 x축으로 -90도 회전
    mesh.rotation.x = -Math.PI / 2;

    scene.add(mesh);

    // 0.2초 후 이펙트 제거
    setTimeout(() => {
        scene.remove(mesh);
        geometry.dispose();
        material.dispose();
    }, 200);
}

export { createMeleeSwingEffect, createMuzzleFlashEffect, initMuzzleFlashPool, muzzleFlashPool };