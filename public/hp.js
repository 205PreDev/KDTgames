import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

export const hp = (() => {
  class HPUI {
    constructor(scene, renderer, playerName = 'Player') {
      this.scene = scene;
      this.renderer = renderer;
      this.playerName = playerName;
      this.hp = 100;
      this.maxHp = 100;

      // 3D HP UI (머리 위에 표시되는 HP 바)
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.canvas.width = 256; // Increased width for better text rendering
      this.canvas.height = 64; // Increased height for better bar and text

      this.texture = new THREE.CanvasTexture(this.canvas);
      this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
      this.sprite = new THREE.Sprite(this.material);
      this.sprite.scale.set(2.2, 0.55, 1); // Adjust scale to fit above head
      this.scene.add(this.sprite);

      this.playerMesh = null;
      this.headBone = null;
      this.offset = new THREE.Vector3(0, 1.9, 0); // Offset above the character's head

      // 피격 효과 빨간 화면
      this.hitEffect = document.createElement('div');
      this.hitEffect.style.position = 'fixed';
      this.hitEffect.style.top = '0';
      this.hitEffect.style.left = '0';
      this.hitEffect.style.width = '100vw';
      this.hitEffect.style.height = '100vh';
      this.hitEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.25)';
      this.hitEffect.style.zIndex = '998';
      this.hitEffect.style.pointerEvents = 'none';
      this.hitEffect.style.opacity = '0';
      this.hitEffect.style.transition = 'opacity 0.1s ease-out';
      document.body.appendChild(this.hitEffect);

      // 사망 오버레이 (상단: "또 죽었어?", 중앙: 카운트다운)
      this.overlay = document.createElement('div');
      this.overlay.style.position = 'fixed';
      this.overlay.style.top = '0';
      this.overlay.style.left = '0';
      this.overlay.style.width = '100vw';
      this.overlay.style.height = '100vh';
      this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.overlay.style.zIndex = '999';
      this.overlay.style.display = 'flex';
      this.overlay.style.flexDirection = 'column';
      this.overlay.style.justifyContent = 'center';
      this.overlay.style.alignItems = 'center';
      this.overlay.style.visibility = 'hidden';

      // 오버레이 상단 문구 (열받게, 상단 중앙)
      this.overlayTopMsg = document.createElement('div');
      this.overlayTopMsg.innerText = '또 죽었어?';
      this.overlayTopMsg.style.position = 'absolute';
      this.overlayTopMsg.style.top = '40px';
      this.overlayTopMsg.style.left = '50%';
      this.overlayTopMsg.style.transform = 'translateX(-50%)';
      this.overlayTopMsg.style.fontSize = '90px';
      this.overlayTopMsg.style.fontWeight = '900';
      this.overlayTopMsg.style.fontFamily = 'Impact', 'Arial Black', 'sans-serif';
      this.overlayTopMsg.style.color = '#ff2222';
      this.overlayTopMsg.style.textShadow =
        '0 0 16px #ff4444, 0 4px 16px #000, 2px 2px 0 #fff, 0 0 2px #fff';
      this.overlayTopMsg.style.letterSpacing = '2px';
      this.overlayTopMsg.style.userSelect = 'none';
      this.overlayTopMsg.style.animation = 'shake 0.5s infinite alternate';
      this.overlay.appendChild(this.overlayTopMsg);

      // CSS 애니메이션(흔들림 효과) 추가
      const style = document.createElement('style');
      style.innerHTML = `
@keyframes shake {
  0% { transform: translateX(-50%) rotate(-2deg); }
  100% { transform: translateX(-50%) rotate(2deg); }
}`;
      document.head.appendChild(style);

      // 오버레이 중앙 카운트다운
      this.overlayCountdown = document.createElement('div');
      this.overlayCountdown.innerText = '3';
      this.overlayCountdown.style.fontSize = '150px';
      this.overlayCountdown.style.fontWeight = 'bold';
      this.overlayCountdown.style.color = '#000000';
      this.overlayCountdown.style.textShadow = '2px 2px 8px #000';
      this.overlayCountdown.style.marginBottom = '0';
      this.overlayCountdown.style.marginTop = '0';
      this.overlay.appendChild(this.overlayCountdown);

      document.body.appendChild(this.overlay);

      this.isDead = false;
      this.deathTimer = null;
      this.countdownTimer = null; // 카운트다운 타이머
      this.lastHp = 100;

      // K/D UI 연동
      this.gameUI = null; // 외부에서 setGameUI로 연결

      this.drawUI();
    }

    setPlayerTarget(playerMesh, headBone) {
      this.playerMesh = playerMesh;
      this.headBone = headBone;
    }

    updateHP(newHp) {
      // Check if HP decreased to show hit effect
      if (newHp < this.hp && !this.isDead) {
        this.flashHitEffect();
      }
      
      this.lastHp = this.hp;
      this.hp = newHp;
      this.drawUI();
      
      // Check for death
      if (this.hp <= 0 && !this.isDead) {
        this.forceDeath();
      }
    }
    
    // K/D UI 연동용
    setGameUI(gameUI) {
      this.gameUI = gameUI;
    }

    flashHitEffect() {
      if (this.hitEffect) {
        this.hitEffect.style.opacity = '1';
        setTimeout(() => {
          this.hitEffect.style.opacity = '0';
        }, 100);
      }
    }

    drawUI() {
      const ctx = this.context;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Player Name
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.playerName, this.canvas.width / 2, this.canvas.height / 4);

      // HP Bar Background
      const barWidth = this.canvas.width * 0.8;
      const barHeight = this.canvas.height / 4;
      const barX = (this.canvas.width - barWidth) / 2;
      const barY = this.canvas.height / 2 + 5; // Position below name
      ctx.fillStyle = '#555';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // HP Bar Fill
      const hpWidth = (this.hp / this.maxHp) * barWidth;
      ctx.fillStyle = 'red';
      ctx.fillRect(barX, barY, hpWidth, barHeight);

      // HP Text
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`${Math.round(this.hp)} / ${this.maxHp}`, this.canvas.width / 2, barY + barHeight / 2 + 5);

      this.texture.needsUpdate = true;
    }

    updatePosition() {
      if (this.playerMesh && this.headBone) {
        const headWorldPosition = new THREE.Vector3();
        this.headBone.getWorldPosition(headWorldPosition);
        this.sprite.position.copy(headWorldPosition).add(this.offset);
        // console.log(`HPUI Head Y: ${headWorldPosition.y}, Sprite Y: ${this.sprite.position.y}`); // 디버그 로그 제거
      } else if (this.playerMesh) {
        // headBone이 없는 경우를 대비하여 기존 로직 유지 (fallback)
        const playerWorldPosition = new THREE.Vector3();
        this.playerMesh.getWorldPosition(playerWorldPosition);
        this.sprite.position.copy(playerWorldPosition).add(this.offset);
        // console.log(`HPUI Player Y (fallback): ${playerWorldPosition.y}, Sprite Y: ${this.sprite.position.y}`); // 디버그 로그 제거
      }
    }

    hide() {
      this.sprite.visible = false;
    }

    show() {
      this.sprite.visible = true;
    }

    showDeathOverlay() {
      this.overlay.style.visibility = 'visible';
    }

    hideDeathOverlay() {
      this.overlay.style.visibility = 'hidden';
    }

    forceDeath() {
      if (!this.isDead) {
        this.isDead = true;
        this.playDeathMotion();
        this.showDeathOverlay();
        // K/D UI 연동: 사망 시 addDeath 호출
        if (this.gameUI && typeof this.gameUI.addDeath === 'function') {
          this.gameUI.addDeath();
        }
        this.startCountdown(3);
      }
    }

    startCountdown(seconds) {
      let count = seconds;
      this.overlayCountdown.innerText = count;
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = setInterval(() => {
        count--;
        this.overlayCountdown.innerText = count;
        if (count <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          this.playIdleMotion();
          if (this.playerMesh && typeof this.playerMesh.Revive === 'function') {
            this.playerMesh.Revive();
          }
          this.hideDeathOverlay();
          this.isDead = false;
          this.lastHp = 100;
          this.hp = 100;
          this.drawUI();
        }
      }, 1000);
    }

    playDeathMotion() {
      if (!this.playerMesh || !this.playerMesh.mixer_ || !this.playerMesh.animations_) return;
      const deathAction = this.playerMesh.animations_['Death'];
      if (deathAction && this.playerMesh.currentAction_ !== deathAction) {
        if (this.playerMesh.currentAction_) {
          this.playerMesh.currentAction_.fadeOut(0.3);
        }
        this.playerMesh.currentAction_ = deathAction;
        deathAction.setLoop(THREE.LoopOnce, 1);
        deathAction.clampWhenFinished = true;
        this.playerMesh.currentAction_.reset().fadeIn(0.3).play();
      }
    }

    playIdleMotion() {
      if (!this.playerMesh || !this.playerMesh.mixer_ || !this.playerMesh.animations_) return;
      const idleAction = this.playerMesh.animations_['Idle'];
      if (idleAction && this.playerMesh.currentAction_ !== idleAction) {
        if (this.playerMesh.currentAction_) {
          this.playerMesh.currentAction_.fadeOut(0.3);
        }
        this.playerMesh.currentAction_ = idleAction;
        this.playerMesh.currentAction_.reset().fadeIn(0.3).play();
      }
    }

    dispose() {
      this.scene.remove(this.sprite);
      this.material.dispose();
      this.texture.dispose();
      
      // Remove DOM elements
      if (this.hitEffect && this.hitEffect.parentNode) {
        this.hitEffect.parentNode.removeChild(this.hitEffect);
      }
      
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      
      // Clear timers
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }
  }

  return { HPUI };
})();