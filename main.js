import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';
import { player } from './player.js';
import { object } from './object.js';
import { math } from './math.js';

class GameStage3 {
    constructor() {
        this.Initialize();
        this.RAF();
    }

    Initialize() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaFactor = 2.2;
        document.getElementById('container').appendChild(this.renderer.domElement);

        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 2000.0;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(-8, 6, 12);
        this.camera.lookAt(0, 2, 0);

        this.scene = new THREE.Scene();

        this.SetupLighting();
        this.SetupSkyAndFog();
        this.CreateGround();
        this.CreateWeapons();
        this.CreatePlayer();

        window.addEventListener('resize', () => this.OnWindowResize(), false);
    }

    SetupLighting() {
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
        directionalLight.position.set(60, 100, 10);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.bias = -0.001;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 1.0;
        directionalLight.shadow.camera.far = 200.0;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);

        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0xF6F47F, 0.6);
        this.scene.add(hemisphereLight);
    }

    SetupSkyAndFog() {
        const skyUniforms = {
            topColor:    { value: new THREE.Color(0x0077FF) },
            bottomColor: { value: new THREE.Color(0x89b2eb) },
            offset:      { value: 33 },
            exponent:    { value: 0.6 }
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
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);
    }

    CreateGround() {
        const groundGeometry = new THREE.PlaneGeometry(500, 500, 10, 10);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x81c147 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    CreatePlayer() {
        this.player_ = new player.Player({ scene: this.scene, weapons: this.weapons_ });

        // NPC 추가
        const npcPos = new THREE.Vector3(0, 0, -4);
        this.npc_ = new object.NPC(this.scene, npcPos);

        // 카메라 설정
        this.cameraTargetOffset = new THREE.Vector3(0, 10, 10);
        this.rotationAngle = 0;
        window.addEventListener('mousemove', (e) => this.OnMouseMove(e), false);
    }

    CreateWeapons() {
        this.weapons_ = [];
        const weaponNames = ['Sword.fbx', 'Axe_Double.fbx', 'Bow_Wooden.fbx', 'Dagger.fbx', 'Hammer_Double.fbx'];
        for (let i = 0; i < 5; i++) {
            const weaponName = weaponNames[i];
            const pos = new THREE.Vector3(math.rand_int(-20, 20), 0, math.rand_int(-20, 20));
            const weapon = new object.Weapon(this.scene, weaponName, pos);
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
        this.camera.position.lerp(cameraPos, 0.1);
        this.camera.lookAt(target);
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
        }

        if (this.npc_) {
            this.npc_.Update(delta);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

let game = null;
window.addEventListener('DOMContentLoaded', () => {
    game = new GameStage3();
});