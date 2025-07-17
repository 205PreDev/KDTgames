/**
 * 무기 시스템 - 기존 프로젝트 통합 버전
 * 기존 item.js, player.js, main.js와 호환되도록 수정
 */

// 기존 WEAPON_DATA와 호환되는 무기 데이터
export const WEAPON_DATA = {
    // 근접 무기
    'Sword.fbx': { 
        id: 'sword',
        name: '한손검',
        type: 'melee', 
        category: 'medium',
        radius: 2.0, 
        angle: Math.PI / 3, 
        damage: 25, 
        attackSpeedMultiplier: 1.8, 
        attackType: 'single', 
        specialEffect: null, // 추후 추가 예정
        reach: 1.5,
        penetration: 8,
        staggerChance: 0.08,
        durability: 150,
        weight: 1.2,
        cost: 300,
        rarity: 'common',
        description: '균형잡힌 성능의 한손검입니다.'
    },
    'Axe_Double.fbx': { 
        id: 'doubleaxe',
        name: '양날도끼',
        type: 'melee', 
        category: 'medium',
        radius: 2.2, 
        angle: Math.PI / 2.5, 
        damage: 30, 
        attackSpeedMultiplier: 1.5, 
        attackType: 'aoe', 
        specialEffect: 'knockback', // 추후 추가 예정
        reach: 1.3,
        penetration: 10,
        staggerChance: 0.12,
        durability: 140,
        weight: 1.8,
        cost: 400,
        rarity: 'rare',
        description: '이중 공격이 가능한 양날도끼입니다.'
    },
    'Dagger.fbx': { 
        id: 'dagger',
        name: '단검',
        type: 'melee', 
        category: 'light',
        radius: 1.5, 
        angle: Math.PI / 2, 
        damage: 15, 
        attackSpeedMultiplier: 2.5, 
        attackType: 'single', 
        specialEffect: 'critical_bleed', // 추후 추가 예정
        reach: 1.2,
        penetration: 5,
        staggerChance: 0.05,
        durability: 100,
        weight: 0.8,
        cost: 100,
        rarity: 'common',
        description: '가벼운 단검으로 빠른 공격이 가능합니다.'
    },
    'Hammer_Double.fbx': { 
        id: 'hammer',
        name: '해머',
        type: 'melee', 
        category: 'heavy',
        radius: 2.5, 
        angle: Math.PI / 2.2, 
        damage: 50, 
        attackSpeedMultiplier: 0.8, 
        attackType: 'small_aoe', 
        specialEffect: 'stun', // 추후 추가 예정
        reach: 1.8,
        penetration: 20,
        staggerChance: 0.25,
        durability: 300,
        weight: 4.0,
        cost: 1000,
        rarity: 'epic',
        description: '최고 공격력과 기절 효과를 가진 해머입니다.'
    },
    'Sword_big.fbx': { 
        id: 'greatsword',
        name: '대검',
        type: 'melee', 
        category: 'heavy',
        radius: 2.6, 
        angle: Math.PI / 3.1, 
        damage: 45, 
        attackSpeedMultiplier: 1.0, 
        attackType: 'single', 
        specialEffect: null, // 추후 추가 예정
        reach: 2.2,
        penetration: 18,
        staggerChance: 0.12,
        durability: 250,
        weight: 3.0,
        cost: 800,
        rarity: 'epic',
        description: '최대 사거리를 가진 대검입니다.'
    },
    'Axe_small_Golden.fbx': { 
        id: 'handaxe',
        name: '손도끼',
        type: 'melee', 
        category: 'light',
        radius: 1.8, 
        angle: Math.PI / 2.1, 
        damage: 20, 
        attackSpeedMultiplier: 2.0, 
        attackType: 'single', 
        specialEffect: null, // 추후 추가 예정
        reach: 1.0,
        penetration: 3,
        staggerChance: 0.15,
        durability: 120,
        weight: 1.0,
        cost: 150,
        rarity: 'common',
        description: '기절 효과가 있는 손도끼입니다.'
    },

    // 황금 무기 (Golden Weapons)
    'Axe_Double_Golden.fbx': {
        id: 'doubleaxe_golden',
        name: '황금 양날도끼',
        type: 'melee',
        category: 'medium',
        radius: 2.3,
        angle: Math.PI / 2.4,
        damage: 40,
        attackSpeedMultiplier: 1.6,
        attackType: 'aoe',
        specialEffect: 'super_knockback',
        reach: 1.4,
        penetration: 15,
        staggerChance: 0.18,
        durability: 200,
        weight: 1.9,
        cost: 1500,
        rarity: 'legendary',
        description: '강력한 황금 양날도끼입니다.'
    },
    'Dagger_Golden.fbx': {
        id: 'dagger_golden',
        name: '황금 단검',
        type: 'melee',
        category: 'light',
        radius: 1.6,
        angle: Math.PI / 1.8,
        damage: 25,
        attackSpeedMultiplier: 3.0,
        attackType: 'single',
        specialEffect: 'super_critical_bleed',
        reach: 1.3,
        penetration: 8,
        staggerChance: 0.08,
        durability: 150,
        weight: 0.9,
        cost: 800,
        rarity: 'epic',
        description: '매우 빠른 황금 단검입니다.'
    },
    'Hammer_Double_Golden.fbx': {
        id: 'hammer_golden',
        name: '황금 해머',
        type: 'melee',
        category: 'heavy',
        radius: 2.8,
        angle: Math.PI / 2.1,
        damage: 70,
        attackSpeedMultiplier: 0.9,
        attackType: 'large_aoe',
        specialEffect: 'super_stun',
        reach: 2.0,
        penetration: 30,
        staggerChance: 0.35,
        durability: 400,
        weight: 4.5,
        cost: 3000,
        rarity: 'legendary',
        description: '압도적인 파괴력의 황금 해머입니다.'
    },
    'Sword_big_Golden.fbx': {
        id: 'greatsword_golden',
        name: '황금 대검',
        type: 'melee',
        category: 'heavy',
        radius: 2.8,
        angle: Math.PI / 3.0,
        damage: 60,
        attackSpeedMultiplier: 1.1,
        attackType: 'single',
        specialEffect: 'armor_shred',
        reach: 2.5,
        penetration: 25,
        staggerChance: 0.15,
        durability: 350,
        weight: 3.5,
        cost: 2500,
        rarity: 'legendary',
        description: '최대 사거리와 방어구 파괴 효과를 가진 황금 대검입니다.'
    },
    'Sword_Golden.fbx': {
        id: 'sword_golden',
        name: '황금 한손검',
        type: 'melee',
        category: 'medium',
        radius: 2.1,
        angle: Math.PI / 2.8,
        damage: 35,
        attackSpeedMultiplier: 2.0,
        attackType: 'single',
        specialEffect: 'holy_damage',
        reach: 1.6,
        penetration: 10,
        staggerChance: 0.10,
        durability: 200,
        weight: 1.3,
        cost: 1000,
        rarity: 'epic',
        description: '신성한 힘이 깃든 황금 한손검입니다.'
    },

    // 원거리 무기
    'Pistol_1.fbx': { 
        id: 'pistol',
        name: '권총',
        type: 'ranged', 
        subtype: 'firearm',
        category: 'light',
        radius: 10.0, 
        angle: Math.PI / 12, 
        damage: 20, 
        attackSpeedMultiplier: 2.0, 
        attackType: 'ranged', 
        specialEffect: null, // 추후 추가 예정
        ammoType: 'pistol_ammo',
        magazineSize: 12,
        reloadTime: 1.5,
        accuracy: 85,
        recoil: 10,
        fireMode: 'single',
        durability: 200,
        weight: 1.0,
        cost: 500,
        rarity: 'common',
        description: '빠른 재장전이 가능한 권총입니다.',
        projectileSpeed: 40,
        projectileSize: 0.2,
        projectileEffect: null
    },
    'SubmachineGun_1.fbx': { 
        id: 'smg',
        name: '기관단총',
        type: 'ranged', 
        subtype: 'firearm',
        category: 'medium',
        radius: 12.0, 
        angle: Math.PI / 18, 
        damage: 18, 
        attackSpeedMultiplier: 8.0, 
        attackType: 'ranged', 
        specialEffect: null, // 추후 추가 예정
        ammoType: 'smg_ammo',
        magazineSize: 30,
        reloadTime: 2.5,
        accuracy: 75,
        recoil: 25,
        fireMode: 'auto',
        durability: 300,
        weight: 2.5,
        cost: 800,
        rarity: 'rare',
        description: '연사가 가능한 기관단총입니다.'
    },
    'Shotgun_1.fbx': { 
        id: 'shotgun',
        name: '샷건',
        type: 'ranged', 
        subtype: 'firearm',
        category: 'medium',
        radius: 8.0, 
        angle: Math.PI / 6, 
        damage: 35, 
        attackSpeedMultiplier: 1.5, 
        attackType: 'ranged', 
        specialEffect: null, // 추후 추가 예정
        ammoType: 'shotgun_ammo',
        magazineSize: 8,
        reloadTime: 3.0,
        accuracy: 60,
        recoil: 40,
        fireMode: 'single',
        durability: 250,
        weight: 3.0,
        cost: 700,
        rarity: 'rare',
        description: '산탄 효과를 가진 샷건입니다.'
    },
    'SniperRifle_1.fbx': { 
        id: 'sniper',
        name: '저격총',
        type: 'ranged', 
        subtype: 'firearm',
        category: 'heavy',
        radius: 30.0, 
        angle: Math.PI / 90, 
        damage: 80, 
        attackSpeedMultiplier: 0.5, 
        attackType: 'ranged', 
        specialEffect: null, // 추후 추가 예정
        ammoType: 'sniper_ammo',
        magazineSize: 5,
        reloadTime: 4.0,
        accuracy: 95,
        recoil: 60,
        fireMode: 'single',
        durability: 400,
        weight: 5.0,
        cost: 1500,
        rarity: 'epic',
        description: '최고 정확도를 가진 저격총입니다.'
    },
    'AssaultRifle_1.fbx': { 
        id: 'assault',
        name: '돌격소총',
        type: 'ranged', 
        subtype: 'firearm',
        category: 'heavy',
        radius: 20.0, 
        angle: Math.PI / 36, 
        damage: 30, 
        attackSpeedMultiplier: 6.0, 
        attackType: 'ranged', 
        specialEffect: null, // 추후 추가 예정
        ammoType: 'assault_ammo',
        magazineSize: 25,
        reloadTime: 3.5,
        accuracy: 80,
        recoil: 30,
        fireMode: 'auto',
        durability: 350,
        weight: 3.5,
        cost: 1200,
        rarity: 'epic',
        description: '다목적 성능을 가진 돌격소총입니다.'
    },

    // 기존 아이템들 (호환성 유지)
    'Potion1_Filled.fbx': { 
        type: 'buff', 
        radius: 0.5, 
        angle: 0, 
        damage: 0, 
        attackSpeedMultiplier: 0, 
        attackType: 'none', 
        specialEffect: null, 
        statEffect: { stat: 'strength', amount: 1 } 
    }
};;

// 기본 무기 클래스 (기존 Item 클래스와 호환)
export class Weapon {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.subtype = config.subtype || null; // subtype 추가
    this.category = config.category;
    this.damage = config.damage;
    this.range = config.radius || config.range;
    this.attackSpeed = config.attackSpeedMultiplier || config.attackSpeed;
    this.durability = config.durability || 100;
    this.maxDurability = this.durability;
    this.weight = config.weight || 1.0;
    this.cost = config.cost || 100;
    this.rarity = config.rarity || 'common';
    this.description = config.description || '';
    this.lastAttackTime = 0;
    
    // 기존 호환성 속성들
    this.attackRadius = config.radius || 1.0;
    this.attackAngle = config.angle || Math.PI / 2;
    this.attackSpeedMultiplier = config.attackSpeedMultiplier || 1.0;
    this.attackType = config.attackType || 'single';
    this.specialEffect = config.specialEffect;
    this.statEffect = config.statEffect;
  }

  // 기본 공격 메서드
  attack() {
    const currentTime = Date.now();
    const timeSinceLastAttack = currentTime - this.lastAttackTime;
    const attackCooldown = 1000 / this.attackSpeed; // 밀리초 단위

    if (timeSinceLastAttack < attackCooldown) {
      return { 
        success: false, 
        message: "공격 쿨다운 중",
        remainingCooldown: attackCooldown - timeSinceLastAttack 
      };
    }

    if (this.durability <= 0) {
      return { 
        success: false, 
        message: "무기가 파손되었습니다" 
      };
    }

    this.lastAttackTime = currentTime;
    this.durability = Math.max(0, this.durability - 1);

    return {
      success: true,
      damage: this.damage,
      durability: this.durability
    };
  }

  // DPS 계산
  getDPS() {
    return this.damage * this.attackSpeed;
  }

  // 내구도 복구
  repair(amount = this.maxDurability) {
    this.durability = Math.min(this.maxDurability, this.durability + amount);
    return this.durability;
  }

  // 무기 정보 반환
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      category: this.category,
      damage: this.damage,
      range: this.range,
      attackSpeed: this.attackSpeed,
      dps: this.getDPS(),
      durability: `${this.durability}/${this.maxDurability}`,
      weight: this.weight,
      cost: this.cost,
      rarity: this.rarity,
      description: this.description
    };
  }
}

// 근접 무기 클래스
export class MeleeWeapon extends Weapon {
  constructor(config) {
    super(config);
    this.reach = config.reach || 1.0;
    this.penetration = config.penetration || 0;
    this.staggerChance = config.staggerChance || 0;
  }

  attack() {
    const baseAttack = super.attack();
    if (!baseAttack.success) {
      return baseAttack;
    }

    const staggerRoll = Math.random();
    const totalDamage = baseAttack.damage + this.penetration;
    
    return {
      ...baseAttack,
      damage: totalDamage,
      staggered: staggerRoll < this.staggerChance,
      reach: this.reach,
      penetration: this.penetration
    };
  }

  // 근접 무기 전용 정보
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      reach: this.reach,
      penetration: this.penetration,
      staggerChance: `${(this.staggerChance * 100).toFixed(1)}%`
    };
  }
}

// 원거리 무기 클래스
export class RangedWeapon extends Weapon {
  constructor(config) {
    super(config);
    this.ammoType = config.ammoType || 'default_ammo';
    this.magazineSize = config.magazineSize || 10;
    this.currentAmmo = this.magazineSize;
    this.reloadTime = config.reloadTime || 2.0;
    this.accuracy = config.accuracy || 80;
    this.recoil = config.recoil || 20;
    this.fireMode = config.fireMode || 'single';
    this.isReloading = false;
    this.reloadStartTime = 0;
    // 추가: 투사체 속성
    this.projectileSpeed = config.projectileSpeed || 30;
    this.projectileSize = config.projectileSize || 0.4;
    this.projectileEffect = config.projectileEffect || null;
  }

  attack() {
    if (this.isReloading) {
      const currentTime = Date.now();
      const reloadElapsed = currentTime - this.reloadStartTime;
      
      if (reloadElapsed < this.reloadTime * 1000) {
        return { 
          success: false, 
          message: "재장전 중",
          remainingReloadTime: (this.reloadTime * 1000) - reloadElapsed
        };
      } else {
        this.isReloading = false;
        this.currentAmmo = this.magazineSize;
      }
    }

    if (this.currentAmmo <= 0) {
      this.reload();
      return { 
        success: false, 
        message: "재장전 필요",
        reloading: true
      };
    }

    const baseAttack = super.attack();
    if (!baseAttack.success) {
      return baseAttack;
    }

    this.currentAmmo--;
    const accuracyRoll = Math.random() * 100;
    const hit = accuracyRoll <= this.accuracy;
    
    return {
      ...baseAttack,
      damage: hit ? baseAttack.damage : 0,
      hit: hit,
      accuracy: this.accuracy,
      ammoRemaining: this.currentAmmo,
      recoil: this.recoil
    };
  }

  // 재장전
  reload() {
    if (!this.isReloading && this.currentAmmo < this.magazineSize) {
      this.isReloading = true;
      this.reloadStartTime = Date.now();
      return { 
        success: true, 
        message: "재장전 시작",
        reloadTime: this.reloadTime 
      };
    }
    return { 
      success: false, 
      message: "재장전 불필요" 
    };
  }

  // 탄약 추가
  addAmmo(amount) {
    this.currentAmmo = Math.min(this.magazineSize, this.currentAmmo + amount);
    return this.currentAmmo;
  }

  // 원거리 무기 전용 정보
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      ammoType: this.ammoType,
      ammo: `${this.currentAmmo}/${this.magazineSize}`,
      reloadTime: this.reloadTime,
      accuracy: `${this.accuracy}%`,
      recoil: this.recoil,
      fireMode: this.fireMode,
      isReloading: this.isReloading
    };
  }
}

// 무기 팩토리 클래스
export class WeaponFactory {
  static weaponCache = new Map();

  // 무기 생성 (기존 WEAPON_DATA와 호환)
  static createWeapon(weaponFileName) {
    // 캐시 확인
    if (this.weaponCache.has(weaponFileName)) {
      return this.weaponCache.get(weaponFileName);
    }

    const weaponData = WEAPON_DATA[weaponFileName];
    if (!weaponData) {
      throw new Error(`무기 데이터를 찾을 수 없습니다: ${weaponFileName}`);
    }

    // 무기 타입에 따라 적절한 클래스로 생성
    let weapon;
    if (weaponData.type === 'melee') {
      weapon = new MeleeWeapon(weaponData);
    } else if (weaponData.type === 'ranged') {
      weapon = new RangedWeapon(weaponData);
    } else {
      weapon = new Weapon(weaponData);
    }

    // 캐시에 저장
    this.weaponCache.set(weaponFileName, weapon);
    return weapon;
  }

  // 모든 무기 목록 반환
  static getAllWeapons() {
    const weapons = [];
    for (const fileName in WEAPON_DATA) {
      if (WEAPON_DATA[fileName].type === 'melee' || WEAPON_DATA[fileName].type === 'ranged') {
        weapons.push({
          fileName: fileName,
          ...WEAPON_DATA[fileName]
        });
      }
    }
    return weapons;
  }

  // 타입별 무기 목록 반환
  static getWeaponsByType(type) {
    const weapons = [];
    for (const fileName in WEAPON_DATA) {
      if (WEAPON_DATA[fileName].type === type) {
        weapons.push({
          fileName: fileName,
          ...WEAPON_DATA[fileName]
        });
      }
    }
    return weapons;
  }

  // 카테고리별 무기 목록 반환
  static getWeaponsByCategory(category) {
    const weapons = [];
    for (const fileName in WEAPON_DATA) {
      if (WEAPON_DATA[fileName].category === category) {
        weapons.push({
          fileName: fileName,
          ...WEAPON_DATA[fileName]
        });
      }
    }
    return weapons;
  }

  // 캐시 클리어
  static clearCache() {
    this.weaponCache.clear();
  }
}

// 무기 관리자 클래스 (플레이어 인벤토리 등에서 사용)
export class WeaponManager {
  constructor() {
    this.weapons = new Map();
    this.equippedWeapon = null;
  }

  // 무기 추가
  addWeapon(weaponFileName) {
    try {
      const weapon = WeaponFactory.createWeapon(weaponFileName);
      this.weapons.set(weaponFileName, weapon);
      return weapon;
    } catch (error) {
      console.error('무기 추가 실패:', error);
      return null;
    }
  }

  // 무기 제거
  removeWeapon(weaponFileName) {
    if (this.equippedWeapon && this.equippedWeapon.id === weaponFileName) {
      this.equippedWeapon = null;
    }
    return this.weapons.delete(weaponFileName);
  }

  // 무기 장착
  equipWeapon(weaponFileName) {
    const weapon = this.weapons.get(weaponFileName);
    if (weapon) {
      this.equippedWeapon = weapon;
      return weapon;
    }
    return null;
  }

  // 장착된 무기로 공격
  attack() {
    if (!this.equippedWeapon) {
      return { success: false, message: "장착된 무기가 없습니다." };
    }
    return this.equippedWeapon.attack();
  }

  // 보유 무기 목록 반환
  getWeapons() {
    return Array.from(this.weapons.values());
  }

  // 장착된 무기 정보 반환
  getEquippedWeapon() {
    return this.equippedWeapon;
  }
}

// 기존 코드와의 호환성을 위한 헬퍼 함수들
export function getWeaponData(weaponFileName) {
  return WEAPON_DATA[weaponFileName] || null;
}

export function createWeaponFromFileName(weaponFileName) {
  return WeaponFactory.createWeapon(weaponFileName);
}

// 기존 ATTACK_TYPE 상수들 (호환성 유지)
export const ATTACK_TYPE_MELEE = 'melee';
export const ATTACK_TYPE_RANGED = 'ranged'; 