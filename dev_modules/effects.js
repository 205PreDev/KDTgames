import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

/**
 * 근접 공격 시각 효과(부채꼴)를 생성하고 짧은 시간 동안 보여줍니다.
 * @param {THREE.Object3D} player - 플레이어 객체
 * @param {THREE.Scene} scene - 렌더링할 씬
 */
function createMeleeSwingEffect(player, scene) {
    // 무기 데이터가 없으면 기본값 사용
    const attackAngle = player.currentWeapon?.angle || 45;
    const attackRange = player.currentWeapon?.range || 1.5;

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
        console.warn("Player or player's position/rotation is undefined for melee swing effect.");
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

/**
 * 원거리 공격 시 총구 화염 효과를 생성합니다.
 * @param {THREE.Object3D} player - 플레이어 객체
 * @param {THREE.Scene} scene - 렌더링할 씬
 */
function createMuzzleFlashEffect(player, scene) {
    if (!player.equippedWeapon_ || !player.equippedWeapon_.model_) return;

    const light = new THREE.PointLight(0xffcc00, 2, 5, 2); // 색상, 강도, 거리, 감쇠

    // 무기 모델의 월드 포지션을 가져와서 빛의 위치로 설정
    const weaponPosition = new THREE.Vector3();
    player.equippedWeapon_.model_.getWorldPosition(weaponPosition);
    light.position.copy(weaponPosition);

    scene.add(light);

    // 0.1초 후 빛 제거
    setTimeout(() => {
        scene.remove(light);
    }, 100);
}

export { createMeleeSwingEffect, createMuzzleFlashEffect };