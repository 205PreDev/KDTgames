// ui.js
export const ui = (() => {
  class GameUI {
    constructor() {
      // ===============================
      // 킬/데스(K/D) UI 생성 (우측 상단)
      // ===============================
      this.kdContainer = document.createElement('div');
      this.kdContainer.style.position = 'absolute';
      this.kdContainer.style.top = '30px';
      this.kdContainer.style.right = '30px';
      this.kdContainer.style.zIndex = '300';
      this.kdContainer.style.background = 'rgba(30,40,60,0.85)';
      this.kdContainer.style.borderRadius = '10px';
      this.kdContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
      this.kdContainer.style.padding = '10px 24px';
      this.kdContainer.style.display = 'flex';
      this.kdContainer.style.flexDirection = 'column';
      this.kdContainer.style.alignItems = 'center';
      this.kdContainer.style.minWidth = '120px';

      // 타이틀
      this.kdTitle = document.createElement('div');
      this.kdTitle.innerText = 'K / D';
      this.kdTitle.style.color = '#fff';
      this.kdTitle.style.fontWeight = 'bold';
      this.kdTitle.style.fontSize = '16px';
      this.kdTitle.style.letterSpacing = '1px';
      this.kdTitle.style.marginBottom = '6px';
      this.kdContainer.appendChild(this.kdTitle);

      // K/D 수치
      this.kdValue = document.createElement('div');
      this.kdValue.innerText = '0 / 0';
      this.kdValue.style.color = '#ffec70';
      this.kdValue.style.fontWeight = 'bold';
      this.kdValue.style.fontSize = '28px';
      this.kdValue.style.textShadow = '0 1px 4px #0008';
      this.kdContainer.appendChild(this.kdValue);

      document.body.appendChild(this.kdContainer);

      // 내부 상태
      this.kills = 0;
      this.deaths = 0;
    }

    setKillsAndDeaths(kills, deaths) {
      this.kills = kills;
      this.deaths = deaths;
      this.kdValue.innerText = `${kills} / ${deaths}`;
    }

    addKill() {
      this.kills += 1;
      this.kdValue.innerText = `${this.kills} / ${this.deaths}`;
    }

    addDeath() {
      this.deaths += 1;
      this.kdValue.innerText = `${this.kills} / ${this.deaths}`;
    }

    resetKD() {
      this.kills = 0;
      this.deaths = 0;
      this.kdValue.innerText = '0 / 0';
    }
  }

  class NPCUI {
    constructor() {
      this.npcContainer = document.createElement('div');
      this.npcContainer.style.position = 'absolute';
      this.npcContainer.style.top = '50%';
      this.npcContainer.style.left = 'calc(50% + 100px)'; // Adjust as needed
      this.npcContainer.style.transform = 'translate(-50%, -50%)';
      this.npcContainer.style.zIndex = '200';
      this.npcContainer.style.background = 'rgba(0,0,0,0.7)';
      this.npcContainer.style.borderRadius = '5px';
      this.npcContainer.style.padding = '5px 10px';
      this.npcContainer.style.color = '#fff';
      this.npcContainer.style.fontSize = '14px';
      this.npcContainer.style.display = 'none'; // Hidden by default

      this.npcName = document.createElement('div');
      this.npcName.style.fontWeight = 'bold';
      this.npcContainer.appendChild(this.npcName);

      this.npcHealth = document.createElement('div');
      this.npcContainer.appendChild(this.npcHealth);

      document.body.appendChild(this.npcContainer);
    }

    show(name, health) {
      this.npcName.innerText = name;
      this.npcHealth.innerText = `Health: ${health}`;
      this.npcContainer.style.display = 'block';
    }

    hide() {
      this.npcContainer.style.display = 'none';
    }

    updatePosition(x, y) {
      this.npcContainer.style.left = `${x}px`;
      this.npcContainer.style.top = `${y}px`;
    }
  }

  class PlayerStatUI {
    constructor() {
      this.statContainer = document.createElement('div');
      this.statContainer.style.position = 'absolute';
      this.statContainer.style.top = '50%';
      this.statContainer.style.right = '30px';
      this.statContainer.style.transform = 'translateY(-50%)';
      this.statContainer.style.zIndex = '200';
      this.statContainer.style.background = 'rgba(0,0,0,0.7)';
      this.statContainer.style.borderRadius = '5px';
      this.statContainer.style.padding = '10px';
      this.statContainer.style.color = '#fff';
      this.statContainer.style.fontSize = '14px';
      this.statContainer.style.display = 'none'; // Hidden by default

      this.playerName = document.createElement('div');
      this.playerName.style.fontWeight = 'bold';
      this.statContainer.appendChild(this.playerName);

      // 기존 항목 제거: this.playerPosition, this.playerAttack
      // this.playerPosition = document.createElement('div');
      // this.statContainer.appendChild(this.playerPosition);

      this.playerHealth = document.createElement('div');
      this.statContainer.appendChild(this.playerHealth);

      // 투사체 위치 및 반경 표시용
      this.projectileInfo = document.createElement('div');
      this.statContainer.appendChild(this.projectileInfo);

      this.playerSpeed = document.createElement('div');
      this.statContainer.appendChild(this.playerSpeed);

      this.playerStrength = document.createElement('div');
      this.statContainer.appendChild(this.playerStrength);

      this.playerAgility = document.createElement('div');
      this.statContainer.appendChild(this.playerAgility);

      this.playerStamina = document.createElement('div');
      this.statContainer.appendChild(this.playerStamina);

      document.body.appendChild(this.statContainer);
    }

    show(name) {
      this.playerName.innerText = name;
      this.statContainer.style.display = 'block';
    }

    hide() {
      this.statContainer.style.display = 'none';
    }

    updateStats(stats) {
      // 좌표, 공격력 미표시
      // this.playerPosition.innerText = `Position: (${stats.position.x.toFixed(2)}, ${stats.position.y.toFixed(2)}, ${stats.position.z.toFixed(2)})`;
      this.playerHealth.innerText = `Health: ${stats.health}`;
      // this.playerAttack.innerText = `Attack: ${stats.attack}`;
      // 투사체 정보 표시
      if (stats.projectilePosition && stats.projectileRadius !== undefined) {
        const p = stats.projectilePosition;
        this.projectileInfo.innerText = `Projectile: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})  |  Radius: ${stats.projectileRadius}`;
      } else {
        this.projectileInfo.innerText = '';
      }
      this.playerSpeed.innerText = `Speed: ${stats.speed.toFixed(2)}`;
      this.playerStrength.innerText = `Strength: ${stats.strength}`;
      this.playerAgility.innerText = `Agility: ${stats.agility}`;
      this.playerStamina.innerText = `Stamina: ${stats.stamina}`;
    }
  }

  return { GameUI, NPCUI, PlayerStatUI };
})();