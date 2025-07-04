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

  return { GameUI };
})();
