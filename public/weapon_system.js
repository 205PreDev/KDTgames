/**
 * 무기 시스템 - 기존 프로젝트 통합 버전
 * 기존 item.js, player.js, main.js와 호환되도록 수정
 */

// 기존 WEAPON_DATA와 호환되는 무기 데이터
export let WEAPON_DATA = {};

// weapon_data.json 로드
export async function loadWeaponData() {
    try {
        const response = await fetch('./resources/data/weapon_data.json');
        WEAPON_DATA = await response.json();
        console.log('Weapon data loaded:', WEAPON_DATA);
    } catch (error) {
        console.error('Failed to load weapon data:', error);
    }
}

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

// 기존 WEAPON_TYPE 상수들 (호환성 유지)
export const WEAPON_TYPE_MELEE = 'melee';
export const WEAPON_TYPE_RANGED = 'ranged';

// 기존 WEAPON_CATEGORY 상수들 (호환성 유지)
export const WEAPON_CATEGORY_LIGHT = 'light';
export const WEAPON_CATEGORY_MEDIUM = 'medium';
export const WEAPON_CATEGORY_HEAVY = 'heavy';

// 기존 WEAPON_RARITY 상수들 (호환성 유지)
export const WEAPON_RARITY_COMMON = 'common';
export const WEAPON_RARITY_RARE = 'rare';
export const WEAPON_RARITY_EPIC = 'epic';
export const WEAPON_RARITY_LEGENDARY = 'legendary';

// 기존 WEAPON_SPECIAL_EFFECT 상수들 (호환성 유지)
export const WEAPON_SPECIAL_EFFECT_KNOCKBACK = 'knockback';
export const WEAPON_SPECIAL_EFFECT_CRITICAL_BLEED = 'critical_bleed';
export const WEAPON_SPECIAL_EFFECT_STUN = 'stun';
export const WEAPON_SPECIAL_EFFECT_SUPER_KNOCKBACK = 'super_knockback';
export const WEAPON_SPECIAL_EFFECT_SUPER_CRITICAL_BLEED = 'super_critical_bleed';
export const WEAPON_SPECIAL_EFFECT_SUPER_STUN = 'super_stun';
export const WEAPON_SPECIAL_EFFECT_ARMOR_SHRED = 'armor_shred';
export const WEAPON_SPECIAL_EFFECT_HOLY_DAMAGE = 'holy_damage';

// 기존 WEAPON_AMMO_TYPE 상수들 (호환성 유지)
export const WEAPON_AMMO_TYPE_PISTOL = 'pistol_ammo';
export const WEAPON_AMMO_TYPE_SMG = 'smg_ammo';
export const WEAPON_AMMO_TYPE_SHOTGUN = 'shotgun_ammo';
export const WEAPON_AMMO_TYPE_SNIPER = 'sniper_ammo';
export const WEAPON_AMMO_TYPE_ASSAULT = 'assault_ammo';

// 기존 WEAPON_FIRE_MODE 상수들 (호환성 유지)
export const WEAPON_FIRE_MODE_SINGLE = 'single';
export const WEAPON_FIRE_MODE_AUTO = 'auto';

// 기존 WEAPON_PROJECTILE_EFFECT 상수들 (호환성 유지)
export const WEAPON_PROJECTILE_EFFECT_NONE = null;

// 기존 WEAPON_STAT_EFFECT 상수들 (호환성 유지)
export const WEAPON_STAT_EFFECT_STRENGTH = 'strength';

// 기존 WEAPON_ATTACK_TYPE 상수들 (호환성 유지)
export const WEAPON_ATTACK_TYPE_SINGLE = 'single';
export const WEAPON_ATTACK_TYPE_AOE = 'aoe';
export const WEAPON_ATTACK_TYPE_SMALL_AOE = 'small_aoe';
export const WEAPON_ATTACK_TYPE_LARGE_AOE = 'large_aoe';
export const WEAPON_ATTACK_TYPE_RANGED = 'ranged';
export const WEAPON_ATTACK_TYPE_NONE = 'none';

// 기존 WEAPON_SUBTYPE 상수들 (호환성 유지)
export const WEAPON_SUBTYPE_FIREARM = 'firearm';

// 기존 WEAPON_DATA_LOADED 플래그 (호환성 유지)
export let WEAPON_DATA_LOADED = true;

// 기존 getRandomWeaponName 함수 (호환성 유지)
export function getRandomWeaponName() {
    const weaponNames = Object.keys(WEAPON_DATA).filter(name => name !== 'Potion1_Filled.fbx');
    if (weaponNames.length === 0) {
        console.warn("No weapons available to spawn (excluding Potion1_Filled.fbx).");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * weaponNames.length);
    return weaponNames[randomIndex];
}

// 기존 spawnWeaponOnMap 함수 (호환성 유지)
export function spawnWeaponOnMap(scene, weaponName, x, y, z, uuid) {
    console.warn("spawnWeaponOnMap is deprecated. Use WeaponFactory.createWeapon and manage model loading separately.");
    // 이 함수는 모델 로딩 로직을 포함하지 않으므로, 실제 3D 모델을 씬에 추가하는 로직은 별도로 구현해야 합니다.
    // 여기서는 단순히 Weapon 객체만 생성하여 반환합니다.
    const weapon = new Weapon3DModel(scene, weaponName, new THREE.Vector3(x, y,    
      z), uuid);
    weapon.position = new THREE.Vector3(x, y, z); // 위치 정보 추가 (모델 로딩 시 사용)
    weapon.uuid = uuid || THREE.MathUtils.generateUUID();
    return weapon;
}

// 기존 Weapon 클래스 (호환성 유지)
export class Weapon3DModel {
    constructor(scene, weaponName, position = new THREE.Vector3(0, 0, 0), uuid = null) {
        this.uuid = uuid || THREE.MathUtils.generateUUID(); // 고유 ID 부여
        this.scene_ = scene;
        this.weaponName = weaponName; // FBX 파일 이름 (예: "Sword.fbx")
        this.model_ = null; // 모델을 저장할 속성

        // WEAPON_DATA가 로드된 후에 모델을 로드하도록 보장
        // 이미 로드되어 있다면 바로 모델 로드
        if (Object.keys(WEAPON_DATA).length > 0) {
            this.LoadModel_(weaponName, position);
        } else {
            // 데이터가 아직 로드되지 않았다면, 로드 완료 후 모델 로드
            loadWeaponData().then(() => {
                this.LoadModel_(weaponName, position);
            });
        }
    }

    LoadModel_(weaponName, position) {
        const loader = new FBXLoader();
        loader.setPath('./resources/weapon/FBX/'); // 무기 FBX 파일 경로

        loader.load(weaponName, (fbx) => {
            const model = fbx;
            // KDTgames-main/item.js의 스케일 로직 참고
            if (/AssaultRifle|Pistol|Shotgun|SniperRifle|SubmachineGun/i.test(weaponName)) {
                model.scale.setScalar(0.005);
            } else {
                model.scale.setScalar(0.01);
            }
            model.position.copy(position);

            model.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            this.scene_.add(model);
            this.model_ = model;
            console.log(`Weapon model ${weaponName} loaded at`, position);
        }, undefined, (error) => {
            console.error(`Error loading weapon model ${weaponName}:`, error);
        });
    }
}