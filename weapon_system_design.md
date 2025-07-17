# 무기 시스템 설계 문서

## 1. 무기 분류 체계

### 1.1 대분류 (근접/원거리)
- **근접 무기 (Melee Weapons)**: 단검, 한손검, 양손검, 대검, 손도끼, 양날도끼, 해머
- **원거리 무기 (Ranged Weapons)**: 권총, 기관단총, 샷건, 저격총, 돌격소총

### 1.2 세부 분류
#### 근접 무기
- **소형 (Light)**: 단검, 손도끼
- **중형 (Medium)**: 한손검, 양날도끼
- **대형 (Heavy)**: 양손검, 대검, 해머

#### 원거리 무기
- **소형 (Light)**: 권총
- **중형 (Medium)**: 기관단총, 샷건
- **중화기 (Heavy)**: 저격총, 돌격소총

## 2. 공통 속성 정의

### 2.1 기본 속성
```javascript
// 모든 무기의 공통 속성
{
  id: string,           // 고유 식별자
  name: string,         // 무기명
  type: string,         // 근접/원거리
  category: string,     // 소형/중형/대형/중화기
  damage: number,       // 기본 공격력
  range: number,        // 사거리
  attackSpeed: number,  // 공격 속도 (초당 공격 횟수)
  durability: number,   // 내구도
  weight: number,       // 무게
  cost: number,         // 가격
  rarity: string,       // 희귀도 (Common/Rare/Epic/Legendary)
  description: string   // 설명
}
```

### 2.2 근접 무기 전용 속성
```javascript
{
  // 근접 무기 추가 속성
  reach: number,        // 도달 거리
  penetration: number,  // 관통력
  staggerChance: number // 기절 확률
}
```

### 2.3 원거리 무기 전용 속성
```javascript
{
  // 원거리 무기 추가 속성
  ammoType: string,     // 탄약 종류
  magazineSize: number, // 탄창 크기
  reloadTime: number,   // 재장전 시간
  accuracy: number,     // 정확도
  recoil: number,       // 반동
  fireMode: string      // 발사 모드 (Single/Burst/Auto)
}
```

## 3. 무기 데이터 표

| 무기명 | 타입 | 카테고리 | 공격력 | 사거리 | 공격속도 | 무게 | 특수속성 |
|--------|------|----------|--------|--------|----------|------|----------|
| **근접 무기** | | | | | | | |
| 단검 | 근접 | 소형 | 15 | 1.2 | 2.5 | 0.8 | 관통력 +5 |
| 한손검 | 근접 | 중형 | 25 | 1.5 | 1.8 | 1.2 | 균형잡힌 성능 |
| 양손검 | 근접 | 대형 | 40 | 2.0 | 1.2 | 2.5 | 높은 관통력 |
| 대검 | 근접 | 대형 | 45 | 2.2 | 1.0 | 3.0 | 최대 사거리 |
| 손도끼 | 근접 | 소형 | 20 | 1.0 | 2.0 | 1.0 | 기절 확률 +15% |
| 양날도끼 | 근접 | 중형 | 30 | 1.3 | 1.5 | 1.8 | 이중 공격 |
| 해머 | 근접 | 대형 | 50 | 1.8 | 0.8 | 4.0 | 최고 공격력, 기절 확률 +25% |
| **원거리 무기** | | | | | | | |
| 권총 | 원거리 | 소형 | 20 | 15 | 2.0 | 1.0 | 빠른 재장전 |
| 기관단총 | 원거리 | 중형 | 18 | 20 | 8.0 | 2.5 | 연사 가능 |
| 샷건 | 원거리 | 중형 | 35 | 8 | 1.5 | 3.0 | 산탄 효과 |
| 저격총 | 원거리 | 중화기 | 80 | 100 | 0.5 | 5.0 | 최고 정확도 |
| 돌격소총 | 원거리 | 중화기 | 30 | 40 | 6.0 | 3.5 | 다목적 성능 |

## 4. JSON 구현 구조

```json
{
  "weapons": {
    "melee": {
      "light": {
        "dagger": {
          "id": "dagger",
          "name": "단검",
          "type": "melee",
          "category": "light",
          "damage": 15,
          "range": 1.2,
          "attackSpeed": 2.5,
          "durability": 100,
          "weight": 0.8,
          "cost": 100,
          "rarity": "common",
          "description": "가벼운 단검으로 빠른 공격이 가능합니다.",
          "reach": 1.2,
          "penetration": 5,
          "staggerChance": 0.05
        },
        "handaxe": {
          "id": "handaxe",
          "name": "손도끼",
          "type": "melee",
          "category": "light",
          "damage": 20,
          "range": 1.0,
          "attackSpeed": 2.0,
          "durability": 120,
          "weight": 1.0,
          "cost": 150,
          "rarity": "common",
          "description": "기절 효과가 있는 손도끼입니다.",
          "reach": 1.0,
          "penetration": 3,
          "staggerChance": 0.15
        }
      },
      "medium": {
        "onesword": {
          "id": "onesword",
          "name": "한손검",
          "type": "melee",
          "category": "medium",
          "damage": 25,
          "range": 1.5,
          "attackSpeed": 1.8,
          "durability": 150,
          "weight": 1.2,
          "cost": 300,
          "rarity": "common",
          "description": "균형잡힌 성능의 한손검입니다.",
          "reach": 1.5,
          "penetration": 8,
          "staggerChance": 0.08
        },
        "doubleaxe": {
          "id": "doubleaxe",
          "name": "양날도끼",
          "type": "melee",
          "category": "medium",
          "damage": 30,
          "range": 1.3,
          "attackSpeed": 1.5,
          "durability": 140,
          "weight": 1.8,
          "cost": 400,
          "rarity": "rare",
          "description": "이중 공격이 가능한 양날도끼입니다.",
          "reach": 1.3,
          "penetration": 10,
          "staggerChance": 0.12
        }
      },
      "heavy": {
        "twosword": {
          "id": "twosword",
          "name": "양손검",
          "type": "melee",
          "category": "heavy",
          "damage": 40,
          "range": 2.0,
          "attackSpeed": 1.2,
          "durability": 200,
          "weight": 2.5,
          "cost": 600,
          "rarity": "rare",
          "description": "높은 관통력을 가진 양손검입니다.",
          "reach": 2.0,
          "penetration": 15,
          "staggerChance": 0.10
        },
        "greatsword": {
          "id": "greatsword",
          "name": "대검",
          "type": "melee",
          "category": "heavy",
          "damage": 45,
          "range": 2.2,
          "attackSpeed": 1.0,
          "durability": 250,
          "weight": 3.0,
          "cost": 800,
          "rarity": "epic",
          "description": "최대 사거리를 가진 대검입니다.",
          "reach": 2.2,
          "penetration": 18,
          "staggerChance": 0.12
        },
        "hammer": {
          "id": "hammer",
          "name": "해머",
          "type": "melee",
          "category": "heavy",
          "damage": 50,
          "range": 1.8,
          "attackSpeed": 0.8,
          "durability": 300,
          "weight": 4.0,
          "cost": 1000,
          "rarity": "epic",
          "description": "최고 공격력과 기절 효과를 가진 해머입니다.",
          "reach": 1.8,
          "penetration": 20,
          "staggerChance": 0.25
        }
      }
    },
    "ranged": {
      "light": {
        "pistol": {
          "id": "pistol",
          "name": "권총",
          "type": "ranged",
          "category": "light",
          "damage": 20,
          "range": 15,
          "attackSpeed": 2.0,
          "durability": 200,
          "weight": 1.0,
          "cost": 500,
          "rarity": "common",
          "description": "빠른 재장전이 가능한 권총입니다.",
          "ammoType": "pistol_ammo",
          "magazineSize": 12,
          "reloadTime": 1.5,
          "accuracy": 85,
          "recoil": 10,
          "fireMode": "single"
        }
      },
      "medium": {
        "smg": {
          "id": "smg",
          "name": "기관단총",
          "type": "ranged",
          "category": "medium",
          "damage": 18,
          "range": 20,
          "attackSpeed": 8.0,
          "durability": 300,
          "weight": 2.5,
          "cost": 800,
          "rarity": "rare",
          "description": "연사가 가능한 기관단총입니다.",
          "ammoType": "smg_ammo",
          "magazineSize": 30,
          "reloadTime": 2.5,
          "accuracy": 75,
          "recoil": 25,
          "fireMode": "auto"
        },
        "shotgun": {
          "id": "shotgun",
          "name": "샷건",
          "type": "ranged",
          "category": "medium",
          "damage": 35,
          "range": 8,
          "attackSpeed": 1.5,
          "durability": 250,
          "weight": 3.0,
          "cost": 700,
          "rarity": "rare",
          "description": "산탄 효과를 가진 샷건입니다.",
          "ammoType": "shotgun_ammo",
          "magazineSize": 8,
          "reloadTime": 3.0,
          "accuracy": 60,
          "recoil": 40,
          "fireMode": "single"
        }
      },
      "heavy": {
        "sniper": {
          "id": "sniper",
          "name": "저격총",
          "type": "ranged",
          "category": "heavy",
          "damage": 80,
          "range": 100,
          "attackSpeed": 0.5,
          "durability": 400,
          "weight": 5.0,
          "cost": 1500,
          "rarity": "epic",
          "description": "최고 정확도를 가진 저격총입니다.",
          "ammoType": "sniper_ammo",
          "magazineSize": 5,
          "reloadTime": 4.0,
          "accuracy": 95,
          "recoil": 60,
          "fireMode": "single"
        },
        "assault": {
          "id": "assault",
          "name": "돌격소총",
          "type": "ranged",
          "category": "heavy",
          "damage": 30,
          "range": 40,
          "attackSpeed": 6.0,
          "durability": 350,
          "weight": 3.5,
          "cost": 1200,
          "rarity": "epic",
          "description": "다목적 성능을 가진 돌격소총입니다.",
          "ammoType": "assault_ammo",
          "magazineSize": 25,
          "reloadTime": 3.5,
          "accuracy": 80,
          "recoil": 30,
          "fireMode": "auto"
        }
      }
    }
  }
}
```

## 5. 객체지향 구현 구조

```javascript
// 기본 무기 클래스
class Weapon {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.category = config.category;
    this.damage = config.damage;
    this.range = config.range;
    this.attackSpeed = config.attackSpeed;
    this.durability = config.durability;
    this.weight = config.weight;
    this.cost = config.cost;
    this.rarity = config.rarity;
    this.description = config.description;
  }

  attack() {
    // 기본 공격 로직
    return this.damage;
  }

  getDPS() {
    return this.damage * this.attackSpeed;
  }
}

// 근접 무기 클래스
class MeleeWeapon extends Weapon {
  constructor(config) {
    super(config);
    this.reach = config.reach;
    this.penetration = config.penetration;
    this.staggerChance = config.staggerChance;
  }

  attack() {
    const baseDamage = super.attack();
    const staggerRoll = Math.random();
    
    return {
      damage: baseDamage + this.penetration,
      staggered: staggerRoll < this.staggerChance
    };
  }
}

// 원거리 무기 클래스
class RangedWeapon extends Weapon {
  constructor(config) {
    super(config);
    this.ammoType = config.ammoType;
    this.magazineSize = config.magazineSize;
    this.currentAmmo = this.magazineSize;
    this.reloadTime = config.reloadTime;
    this.accuracy = config.accuracy;
    this.recoil = config.recoil;
    this.fireMode = config.fireMode;
    this.isReloading = false;
  }

  attack() {
    if (this.currentAmmo <= 0) {
      this.reload();
      return { damage: 0, message: "재장전 필요" };
    }

    this.currentAmmo--;
    const accuracyRoll = Math.random() * 100;
    const hit = accuracyRoll <= this.accuracy;
    
    return {
      damage: hit ? this.damage : 0,
      hit: hit,
      ammoRemaining: this.currentAmmo
    };
  }

  reload() {
    if (!this.isReloading) {
      this.isReloading = true;
      setTimeout(() => {
        this.currentAmmo = this.magazineSize;
        this.isReloading = false;
      }, this.reloadTime * 1000);
    }
  }
}

// 무기 팩토리
class WeaponFactory {
  static createWeapon(weaponId, weaponData) {
    if (weaponData.type === 'melee') {
      return new MeleeWeapon(weaponData);
    } else if (weaponData.type === 'ranged') {
      return new RangedWeapon(weaponData);
    }
    return new Weapon(weaponData);
  }
}
```

## 6. 운용 최적화 가이드라인

### 6.1 데이터 관리
- **중앙화된 데이터**: 모든 무기 데이터를 단일 JSON 파일로 관리
- **버전 관리**: 무기 밸런스 조정 시 버전 태그 사용
- **캐싱**: 자주 사용되는 무기 데이터는 메모리에 캐시

### 6.2 성능 최적화
- **객체 풀링**: 무기 인스턴스 재사용으로 메모리 효율성 증대
- **지연 로딩**: 필요할 때만 무기 데이터 로드
- **인덱싱**: 무기 ID 기반 빠른 검색

### 6.3 확장성 고려사항
- **플러그인 시스템**: 새로운 무기 타입 추가 시 기존 코드 수정 최소화
- **설정 파일**: 무기 속성 조정을 코드 수정 없이 가능
- **모듈화**: 무기별 특수 효과를 독립적인 모듈로 구현

이 설계는 유지보수성과 성능을 우선시하면서도, 향후 새로운 무기 추가나 밸런스 조정이 용이하도록 구성되었습니다. 