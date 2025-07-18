// soundManager.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

export class SoundManager {
    constructor(camera) {
        this.audioListener = new THREE.AudioListener();
        camera.add(this.audioListener);

        this.audioLoader = new THREE.AudioLoader();
        this.sounds = {}; // 캐시된 사운드 버퍼 저장
        this.activeSounds = []; // 현재 재생 중인 사운드 인스턴스 관리 (선택 사항)
    }

    /**
     * 사운드 파일을 로드하고 캐싱합니다.
     * @param {string} name 사운드의 고유 이름 (예: 'attack_sound')
     * @param {string} path 사운드 파일의 경로 (예: 'resources/audio/attack.mp3')
     * @returns {Promise<AudioBuffer>} 로드된 AudioBuffer
     */
    loadSound(name, path) {
        return new Promise((resolve, reject) => {
            if (this.sounds[name]) {
                console.log(`Sound '${name}' already loaded.`);
                resolve(this.sounds[name]);
                return;
            }

            this.audioLoader.load(path, (buffer) => {
                this.sounds[name] = buffer;
                console.log(`Sound '${name}' loaded from ${path}`);
                resolve(buffer);
            }, undefined, (error) => {
                console.error(`Error loading sound '${name}' from ${path}:`, error);
                reject(error);
            });
        });
    }

    /**
     * 캐시된 사운드를 재생합니다.
     * @param {string} name 재생할 사운드의 이름
     * @param {object} options 재생 옵션
     * @param {boolean} options.loop 사운드를 반복 재생할지 여부 (기본값: false)
     * @param {number} options.volume 사운드 볼륨 (0.0 ~ 1.0, 기본값: 1.0)
     * @param {number} options.detune 사운드 피치 변경 (기본값: 0)
     * @returns {THREE.Audio|null} 재생된 Audio 인스턴스 또는 null
     */
    playSound(name, options = {}) {
        const buffer = this.sounds[name];
        if (!buffer) {
            console.warn(`Sound '${name}' not loaded. Cannot play.`);
            return null;
        }

        const sound = new THREE.Audio(this.audioListener);
        sound.setBuffer(buffer);
        sound.setLoop(options.loop || false);
        sound.setVolume(options.volume !== undefined ? options.volume : 1.0);
        sound.setDetune(options.detune !== undefined ? options.detune : 0);
        sound.play();

        // 필요하다면 활성 사운드 목록에 추가하여 관리
        // this.activeSounds.push(sound);
        // sound.onEnded = () => {
        //     const index = this.activeSounds.indexOf(sound);
        //     if (index > -1) {
        //         this.activeSounds.splice(index, 1);
        //     }
        // };

        return sound;
    }

    /**
     * 3D 위치에서 사운드를 재생합니다.
     * @param {string} name 재생할 사운드의 이름
     * @param {THREE.Vector3} position 사운드가 재생될 3D 위치
     * @param {object} options 재생 옵션 (playSound와 동일)
     * @returns {THREE.PositionalAudio|null} 재생된 PositionalAudio 인스턴스 또는 null
     */
    playPositionalSound(name, position, options = {}) {
        const buffer = this.sounds[name];
        if (!buffer) {
            console.warn(`Sound '${name}' not loaded. Cannot play positional sound.`);
            return null;
        }

        const sound = new THREE.PositionalAudio(this.audioListener);
        sound.setBuffer(buffer);
        sound.setLoop(options.loop || false);
        sound.setVolume(options.volume !== undefined ? options.volume : 1.0);
        sound.setDetune(options.detune !== undefined ? options.detune : 0);
        
        // PositionalAudio 설정 (기본값)
        sound.setRefDistance(1); // 사운드 감쇠 시작 거리
        sound.setMaxDistance(20); // 사운드가 들리는 최대 거리
        sound.setRolloffFactor(1); // 감쇠율
        sound.setDistanceModel('linear'); // 감쇠 모델

        // 사운드를 재생할 위치에 더미 객체를 생성하여 추가
        const dummyObject = new THREE.Object3D();
        dummyObject.position.copy(position);
        sound.add(dummyObject); // PositionalAudio는 Object3D에 추가되어야 함
        
        sound.play();

        return sound;
    }

    /**
     * 모든 사운드를 중지합니다.
     */
    stopAllSounds() {
        // 현재 활성 사운드를 관리하는 경우에만 유용
        // this.activeSounds.forEach(sound => sound.stop());
        // this.activeSounds = [];
        console.warn("stopAllSounds not fully implemented without active sound tracking.");
    }

    /**
     * 특정 사운드를 중지합니다.
     * @param {THREE.Audio|THREE.PositionalAudio} soundInstance 중지할 사운드 인스턴스
     */
    stopSound(soundInstance) {
        if (soundInstance && soundInstance.isPlaying) {
            soundInstance.stop();
        }
    }
}
