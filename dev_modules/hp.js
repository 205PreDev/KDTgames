// hp.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { player } from './player.js';

export const hp = (() => {
  class HPUI {
    constructor(isNPC = false) {
      // ===============================
      // HP 바 UI 생성
      // ===============================
      this.hpBarContainer = document.createElement('div');
      this.hpBarContainer.style.position = 'absolute';
      if (isNPC) {
        this.hpBarContainer.style.left = '30px';
        this.hpBarContainer.style.top = '30px';
      } else {
        this.hpBarContainer.style.right = '30px';
        this.hpBarContainer.style.bottom = '30px';
      }
      this.hpBarContainer.style.zIndex = '200';
      this.hpBarContainer.style.display = 'flex';
      this.hpBarContainer.style.flexDirection = 'row';
      this.hpBarContainer.style.alignItems = 'center';
      this.hpBarContainer.style.background = '#235280';
      this.hpBarContainer.style.borderRadius = '12px';
      this.hpBarContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18), 0 0px 8px #2228';
      this.hpBarContainer.style.padding = '6px 16px 6px 6px';
      this.hpBarContainer.style.height = '60px';
      this.hpBarContainer.style.minWidth = '250px';

      // 프로필 이미지
      this.hpProfile = document.createElement('img');
      this.hpProfile.src = '';
      this.hpProfile.style.width = '48px';
      this.hpProfile.style.height = '48px';
      this.hpProfile.style.borderRadius = '50%';
      this.hpProfile.style.border = '2.5px solid #fff';
      this.hpProfile.style.background = '#222';
      this.hpProfile.style.objectFit = 'cover';
      this.hpProfile.style.marginRight = '12px';
      this.hpProfile.style.boxShadow = '0 1px 4px #0008';

      // HP 바 배경
      this.hpBarBg = document.createElement('div');
      this.hpBarBg.style.position = 'relative';
      this.hpBarBg.style.width = '170px';
      this.hpBarBg.style.height = '20px';
      this.hpBarBg.style.background = '#1a2a1a';
      this.hpBarBg.style.border = '2px solid #444';
      this.hpBarBg.style.borderRadius = '10px';
      this.hpBarBg.style.overflow = 'hidden';
      this.hpBarBg.style.marginRight = '12px';

      // 실제 HP 게이지 바
      this.hpBarFill = document.createElement('div');
      this.hpBarFill.style.height = '100%';
      this.hpBarFill.style.width = '100%';
      this.hpBarFill.style.background = 'linear-gradient(90deg, #e22 70%, #f88 100%)';
      this.hpBarFill.style.transition = 'width 0.25s';
      this.hpBarFill.style.position = 'absolute';
      this.hpBarFill.style.left = '0';
      this.hpBarFill.style.top = '0';

      // HP 수치 텍스트
      this.hpNumber = document.createElement('div');
      this.hpNumber.innerText = '100';
      this.hpNumber.style.position = 'absolute';
      this.hpNumber.style.top = '50%';
      this.hpNumber.style.transform = 'translateY(-50%)';
      this.hpNumber.style.fontWeight = 'bold';
      this.hpNumber.style.color = '#fff';
      this.hpNumber.style.fontSize = '15px';
      this.hpNumber.style.textShadow = '0 0 3px #000, 0 1px 4px #222c';
      this.hpNumber.style.pointerEvents = 'none';
      this.hpNumber.style.transition = 'left 0.25s';

      this.hpBarBg.appendChild(this.hpBarFill);
      this.hpBarBg.appendChild(this.hpNumber);

      // 플레이어 이름
      this.hpName = document.createElement('div');
      this.hpName.innerText = isNPC ? 'Viking' : '김기찬';
      this.hpName.style.color = '#bfe8ff';
      this.hpName.style.fontWeight = 'bold';
      this.hpName.style.fontSize = '17px';
      this.hpName.style.textShadow = '1px 1px 3px #222c';
      this.hpName.style.letterSpacing = '1px';
      this.hpName.style.marginBottom = '2px';

      // 이름 + HP바 묶음
      this.hpTextBarWrapper = document.createElement('div');
      this.hpTextBarWrapper.style.display = 'flex';
      this.hpTextBarWrapper.style.flexDirection = 'column';
      this.hpTextBarWrapper.style.justifyContent = 'center';
      this.hpTextBarWrapper.appendChild(this.hpName);
      this.hpTextBarWrapper.appendChild(this.hpBarBg);

      this.hpBarContainer.appendChild(this.hpProfile);
      this.hpBarContainer.appendChild(this.hpTextBarWrapper);
      document.body.appendChild(this.hpBarContainer);

      if (!isNPC) {
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

        this.isDead = false;
        this.deathTimer = null;
        this.countdownTimer = null; // 카운트다운 타이머
        this._ctrlPressed = false;
        this.lastHp = 100;

        // K/D UI 연동
        this.gameUI = null; // 외부에서 setGameUI로 연결

        window.addEventListener('keydown', (e) => {
          if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !this._ctrlPressed && !this.isDead) {
            this._ctrlPressed = true;
            if (this.player && typeof this.player.TakeDamage === 'function') {
              this.player.TakeDamage(10);
            }
          }
        });

        window.addEventListener('keyup', (e) => {
          if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            this._ctrlPressed = false;
          }
        });
      }

      this.player = null;
    }

    setTarget(target) {
      this.target = target;
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

    showDeathOverlay() {
      this.overlay.style.visibility = 'visible';
    }

    hideDeathOverlay() {
      this.overlay.style.visibility = 'hidden';
    }

    forceDeath() {
      if (this.player && !this.isDead) {
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
          this.player.Revive();
          this.hideDeathOverlay();
          this.isDead = false;
          this.lastHp = 100;
        }
      }, 1000);
    }

    updateHP(hp) {
      const maxHp = this.target instanceof player.Player ? 100 : 99999999;
      const percent = Math.max(0, Math.min(1, hp / maxHp));
      this.hpBarFill.style.width = (percent * 100) + '%';
      this.hpNumber.innerText = Math.round(hp);
      const offsetPx = 22;
      this.hpNumber.style.left = hp <= 0 ? '0px' : `calc(${percent * 100}% - ${offsetPx}px)`;

      if (hp < this.lastHp && !this.isDead) {
        this.flashHitEffect();
      }
      this.lastHp = hp;

      if (hp <= 0 && !this.isDead) {
        this.forceDeath();
      }
    }

    playDeathMotion() {
      if (!this.player || !this.player.mixer_ || !this.player.animations_) return;
      const deathAction = this.player.animations_['Death'];
      if (deathAction && this.player.currentAction_ !== deathAction) {
        if (this.player.currentAction_) {
          this.player.currentAction_.fadeOut(0.3);
        }
        this.player.currentAction_ = deathAction;
        deathAction.setLoop(THREE.LoopOnce, 1);
        deathAction.clampWhenFinished = true;
        this.player.currentAction_.reset().fadeIn(0.3).play();
      }
    }

    playIdleMotion() {
      if (!this.player || !this.player.mixer_ || !this.player.animations_) return;
      const idleAction = this.player.animations_['Idle'];
      if (idleAction && this.player.currentAction_ !== idleAction) {
        if (this.player.currentAction_) {
          this.player.currentAction_.fadeOut(0.3);
        }
        this.player.currentAction_ = idleAction;
        this.player.currentAction_.reset().fadeIn(0.3).play();
      }
    }

    // === 프로필 얼굴 이미지 추출 기능 ===
    renderCharacterFaceToProfile(mesh, scene, renderer) {
      // 렌더링할 이미지의 크기를 128x128 픽셀로 설정합니다.
      const size = 128;
      // WebGL 렌더 타겟을 생성합니다. 이 곳에 3D 씬의 렌더링 결과가 저장됩니다.
      const renderTarget = new THREE.WebGLRenderTarget(size, size);

      // 모델의 'Head' 본(bone)을 찾기 위한 변수를 초기화합니다.
      let head = null;
      // 모델의 모든 자식 객체를 순회하며 'Head'라는 이름의 객체를 찾습니다.
      mesh.traverse((child) => {
        // 자식 객체의 이름이 'Head'이면 head 변수에 할당합니다.
        if (child.name === "Head") head = child;
      });

      // 얼굴의 월드 좌표와 카메라의 월드 좌표를 저장할 변수를 선언합니다.
      let faceWorldPos, cameraWorldPos;
      // 'Head' 본을 찾았다면 (즉, 캐릭터가 머리 본을 가지고 있다면) 이 블록을 실행합니다.
      if (head) {
        // head 본의 월드 행렬을 업데이트하여 정확한 월드 좌표를 얻을 수 있도록 합니다.
        head.updateMatrixWorld(true);
        // 얼굴의 월드 좌표를 저장할 Vector3 객체를 생성합니다.
        faceWorldPos = new THREE.Vector3();
        // head 본의 월드 좌표를 faceWorldPos에 복사합니다.
        head.getWorldPosition(faceWorldPos);

        // head 본의 월드 쿼터니언(회전)을 저장할 Quaternion 객체를 생성합니다.
        const headQuaternion = new THREE.Quaternion();
        // head 본의 월드 쿼터니언을 headQuaternion에 복사합니다.
        head.getWorldQuaternion(headQuaternion);
        // head 본의 정면 방향 벡터를 계산합니다 (Z축 방향).
        const headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(headQuaternion);
        // 카메라의 월드 좌표를 계산합니다. 얼굴 위치에서 head 본의 정면 방향으로 0.35만큼 떨어진 지점입니다.
        cameraWorldPos = faceWorldPos.clone().add(headForward.multiplyScalar(0.001));
      // 'Head' 본을 찾지 못했다면 (즉, 캐릭터가 머리 본을 가지고 있지 않다면) 이 블록을 실행합니다.
      } else {
        // 메시의 월드 행렬을 업데이트합니다.
        mesh.updateMatrixWorld(true);
        // 얼굴의 월드 좌표를 메시의 로컬 좌표 (0, 1.7, 0)를 월드 좌표로 변환하여 설정합니다.
        faceWorldPos = mesh.localToWorld(new THREE.Vector3(0, 1.7, 0));
        // 카메라의 월드 좌표를 메시의 로컬 좌표 (0, 1.7, 0.7)를 월드 좌표로 변환하여 설정합니다.
        cameraWorldPos = mesh.localToWorld(new THREE.Vector3(0, 1.7, 0.7));
      }

      // 얼굴 렌더링을 위한 원근 카메라를 생성합니다. (시야각 40도, 종횡비 1:1, near/far 클리핑 평면)
      const faceCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
      // 얼굴 카메라의 위치를 계산된 cameraWorldPos로 설정합니다.
      faceCamera.position.copy(cameraWorldPos);
      // 얼굴 카메라가 계산된 faceWorldPos를 바라보도록 설정합니다.
      faceCamera.lookAt(faceWorldPos);

      // 렌더러의 렌더 타겟을 이전에 생성한 renderTarget으로 설정합니다. 이제 렌더링 결과는 화면이 아닌 renderTarget에 저장됩니다.
      renderer.setRenderTarget(renderTarget);
      // 지정된 씬과 얼굴 카메라를 사용하여 렌더링을 수행합니다.
      renderer.render(scene, faceCamera);
      // 렌더러의 렌더 타겟을 다시 기본값(화면)으로 설정합니다.
      renderer.setRenderTarget(null);

      // 렌더 타겟에서 픽셀 데이터를 읽어올 Uint8Array 버퍼를 생성합니다. (RGBA 각 1바이트씩 4채널)
      const buffer = new Uint8Array(size * size * 4);
      // 렌더 타겟의 픽셀 데이터를 버퍼로 읽어옵니다.
      renderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, buffer);

      // 2D 캔버스 요소를 생성합니다.
      const canvas = document.createElement('canvas');
      // 캔버스 너비를 설정합니다.
      canvas.width = size;
      // 캔버스 높이를 설정합니다.
      canvas.height = size;
      // 캔버스의 2D 렌더링 컨텍스트를 가져옵니다.
      const ctx = canvas.getContext('2d');
      // 캔버스에 그릴 ImageData 객체를 생성합니다.
      const imageData = ctx.createImageData(size, size);
      // 읽어온 픽셀 데이터를 ImageData 객체에 설정합니다.
      imageData.data.set(buffer);
      // ImageData 객체를 캔버스에 그립니다.
      ctx.putImageData(imageData, 0, 0);

      // 캔버스 내용을 데이터 URL (PNG 형식)로 변환합니다.
      const dataURL = canvas.toDataURL();
      // HP 프로필 이미지 요소의 src 속성을 데이터 URL로 설정하여 이미지를 표시합니다.
      this.hpProfile.src = dataURL;

      // 사용이 끝난 렌더 타겟 리소스를 해제합니다.
      renderTarget.dispose();
    }
  }

  return { HPUI };
})();