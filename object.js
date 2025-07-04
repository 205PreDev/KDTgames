// object.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js';

export const object = (() => {

  class NPC {
    constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
      this.scene_ = scene;
      this.mixer_ = null;
      this.LoadModel_(position);
    }

    LoadModel_(position) {
      const loader = new GLTFLoader();
      loader.setPath('./resources/char/glTF/');
      loader.load('VikingHelmet.gltf', (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(1);
        model.position.copy(position);

        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        this.scene_.add(model);

        this.mixer_ = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes("idle"));
        if (idleClip) {
          const action = this.mixer_.clipAction(idleClip);
          action.play();
        }

        this.model_ = model;
      });
    }

    Update(timeElapsed) {
      if (this.mixer_) {
        this.mixer_.update(timeElapsed);
      }
    }
  }

  return {
    NPC,
  };

})();