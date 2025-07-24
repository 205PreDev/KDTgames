const fs = require('fs');
const path = require('path');

let WEAPON_DATA = {};

async function loadWeaponData() {
    try {
        const dataPath = path.join(__dirname, 'public', 'resources', 'data', 'weapon_data.json');
        const data = await fs.promises.readFile(dataPath, 'utf8');
        WEAPON_DATA = JSON.parse(data);
        console.log('Server: Weapon data loaded successfully.');
    } catch (error) {
        console.error('Server: Failed to load weapon data:', error);
    }
}

function getRandomWeaponName() {
    const weaponNames = Object.keys(WEAPON_DATA).filter(name => name !== 'Potion1_Filled.fbx');
    if (weaponNames.length === 0) {
        console.warn("Server: No weapons available to spawn (excluding Potion1_Filled.fbx).");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * weaponNames.length);
    return weaponNames[randomIndex];
}

// Load weapon data when the module is first loaded
loadWeaponData();

module.exports = {
    WEAPON_DATA,
    loadWeaponData, // Export for potential re-loading if needed
    getRandomWeaponName
};
