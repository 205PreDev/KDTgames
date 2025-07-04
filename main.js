import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { Weapon } from './weapon.js';
import { player } from './player.js';
import { object } from './object.js';
import { math } from './math.js';
import { ui } from './ui.js';
import { hp } from './hp.js';

// 전역에서 한 번만 생성
const gameUI = new ui.GameUI();
const hpUI = new hp.HPUI();
hpUI.setGameUI(gameUI); // 반드시 연결!

class GameStage3 {
    constructor() {
        // 이미 생성된 hpUI를 사용
        this.hpUI = hpUI;
        this.Initialize();
        this.RAF();
    }

    Initialize() {
        // WebGL 렌더러
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaFactor = 2.2;
        document.getElementById('container').appendChild(this.renderer.domElement);

        // 카메라
        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 2000.0;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(-8, 6, 12);
        this.camera.lookAt(0, 2, 0);

        // 씬
        this.scene = new THREE.Scene();

        // 환경
        this.SetupLighting();
        this.SetupSkyAndFog();
        this.CreateGround();
        this.CreateWeapons();
        this.CreatePlayer();

        window.addEventListener('resize', () => this.OnWindowResize(), false);
    }

    SetupLighting() {
        // 방향성 조명
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
        directionalLight.position.set(60, 100, 10);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.bias = -0.001;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 1.0;
        directionalLight.shadow.camera.far = 200.0;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);

        // 반구 조명
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0xF6F47F, 0.6);
        this.scene.add(hemisphereLight);
    }

    SetupSkyAndFog() {
        // 하늘 셰이더
        const skyUniforms = {
            topColor: { value: new THREE.Color(0x0077FF) },
            bottomColor: { value: new THREE.Color(0x89b2eb) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        };
        const skyGeometry = new THREE.SphereGeometry(1000, 32, 15);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: skyUniforms,
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize( vWorldPosition + offset ).y;
                    gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0), exponent ), 0.0 ) ), 1.0 );
                }`,
            side: THREE.BackSide,
        });
        const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(skyMesh);

        // 안개
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
    }

    CreateGround() {
        // 잔디 텍스처
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('resources/Map.png');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(2, 2);

        // 바닥 메쉬
        const groundGeometry = new THREE.PlaneGeometry(80, 80, 10, 10);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: grassTexture,
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    CreatePlayer() {
        // 플레이어 생성 및 HP UI 연결
        this.player_ = new player.Player({
            scene: this.scene,
            hpUI: this.hpUI,
            weapons: this.weapons_
        });
        this.hpUI.setPlayer(this.player_);

        // NPC 생성
        const npcPos = new THREE.Vector3(0, 0, -4);
        this.npc_ = new object.NPC(this.scene, npcPos);

        // 카메라 오프셋 및 회전
        this.cameraTargetOffset = new THREE.Vector3(0, 15, 10);
        this.rotationAngle = 4.715;

        // 마우스 드래그로 카메라 회전
        window.addEventListener('mousemove', (e) => this.OnMouseMove(e), false);

        // 캐릭터 모델 로딩 후 얼굴 이미지 추출해서 HP UI에 반영
        const checkAndRenderFace = () => {
            if (this.player_ && this.player_.mesh_) {
                this.hpUI.renderCharacterFaceToProfile(this.player_.mesh_, this.scene, this.renderer);
            } else {
                setTimeout(checkAndRenderFace, 100);
            }
        };
        checkAndRenderFace();
    }

    CreateWeapons() {
        this.weapons_ = [];
        const weaponNames = ['Sword.fbx', 'Axe_Double.fbx', 'Bow_Wooden.fbx', 'Dagger.fbx', 'Hammer_Double.fbx'];
        for (let i = 0; i < 5; i++) {
            const weaponName = weaponNames[i];
            const pos = new THREE.Vector3(math.rand_int(-20, 20), 1, math.rand_int(-20, 20));
            const weapon = new Weapon(this.scene, weaponName, pos);
            this.weapons_.push(weapon);
        }
    }

    OnMouseMove(event) {
        if (event.buttons === 1) {
            const deltaX = event.movementX || 0;
            this.rotationAngle -= deltaX * 0.005;
        }
    }

    UpdateCamera() {
        if (!this.player_ || !this.player_.mesh_) return;
        const target = this.player_.mesh_.position.clone();
        const offset = this.cameraTargetOffset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationAngle);
        const cameraPos = target.clone().add(offset);
        this.camera.position.copy(cameraPos);
        // 머리 위를 바라보게
        const headOffset = new THREE.Vector3(0, 2, 0);
        const headPosition = target.clone().add(headOffset);
        this.camera.lookAt(headPosition);
    }

    OnWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    RAF(time) {
        requestAnimationFrame((t) => this.RAF(t));
        if (!this.prevTime) this.prevTime = time || performance.now();
        const delta = ((time || performance.now()) - this.prevTime) * 0.001;
        this.prevTime = time || performance.now();

        if (this.player_) {
            this.player_.Update(delta, this.rotationAngle);
            this.UpdateCamera();
            this.hpUI.updateHP(this.player_.hp_);
        }
        if (this.npc_) {
            this.npc_.Update(delta);
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// 게임 인스턴스 생성
let game = null;
window.addEventListener('DOMContentLoaded', () => {
    game = new GameStage3();
});
