# Design Document

## Overview

이 설계 문서는 현재 게임에서 발생하는 두 가지 주요 문제를 해결하기 위한 접근 방식을 설명합니다:
1. HP UI가 표시되지 않는 문제
2. 맵 객체(건물, 나무, 바위 등)가 생성되지 않는 문제

이러한 문제들은 코드 분석을 통해 식별되었으며, 이 문서에서는 문제의 원인과 해결 방법을 설명합니다.

## Architecture

현재 게임 아키텍처는 다음과 같은 주요 구성 요소로 이루어져 있습니다:

1. **Game 클래스**: 게임의 메인 클래스로, 렌더링, 업데이트 루프, 초기화 등을 담당합니다.
2. **Player 클래스**: 플레이어 캐릭터의 동작, 상태, 입력 처리 등을 담당합니다.
3. **HP 클래스**: 플레이어의 체력 상태와 UI 표시를 담당합니다.
4. **Map 클래스**: 게임 맵과 객체(건물, 나무, 바위 등) 생성을 담당합니다.

이 구성 요소들은 서로 상호작용하여 게임 경험을 제공합니다. 문제 해결을 위해 이 아키텍처를 수정하지 않고, 기존 구성 요소 내에서 버그를 수정할 것입니다.

## Components and Interfaces

### HP UI 문제 해결

HP UI 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **HP 클래스**: 
   - `constructor`: HTML 요소를 가져와 초기화합니다.
   - `UpdateHPBar_`: HP 바와 텍스트를 업데이트합니다.

2. **HTML 구조**:
   - `hp-bar`: HP 바를 표시하는 요소
   - `hp-text`: HP 텍스트를 표시하는 요소

### 맵 객체 생성 문제 해결

맵 객체 생성 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **Game 클래스**:
   - `InitMap_`: Map 클래스를 초기화하고 맵 생성을 호출합니다.

2. **Map 클래스**:
   - `generateMap`: 맵 객체(건물, 나무, 바위 등)를 생성합니다.
   - `createBuildings`: 건물을 생성합니다.
   - `createDecorations`: 나무와 바위를 생성합니다.

## Error Handling

오류 처리를 개선하기 위해 다음과 같은 접근 방식을 사용합니다:

1. **HP UI 요소 확인**:
   - HP 클래스 생성자에서 HTML 요소가 존재하는지 확인합니다.
   - 요소가 없는 경우 콘솔에 오류를 기록하고 UI 업데이트를 건너뜁니다.

2. **스크립트 로드 순서 확인**:
   - 필요한 모든 스크립트가 올바른 순서로 로드되었는지 확인합니다.
   - 의존성이 있는 스크립트가 먼저 로드되도록 합니다.

3. **맵 생성 오류 처리**:
   - Map 클래스의 메서드에서 발생할 수 있는 오류를 try-catch 블록으로 처리합니다.
   - 오류가 발생해도 게임이 계속 실행될 수 있도록 합니다.

## Testing Strategy

다음과 같은 테스트 전략을 사용하여 수정 사항을 검증합니다:

1. **HP UI 테스트**:
   - 게임 로드 시 HP UI가 표시되는지 확인합니다.
   - 플레이어가 데미지를 입을 때 HP UI가 업데이트되는지 확인합니다.
   - 플레이어가 체력을 회복할 때 HP UI가 업데이트되는지 확인합니다.

2. **맵 객체 생성 테스트**:
   - 게임 로드 시 건물이 생성되는지 확인합니다.
   - 게임 로드 시 나무가 생성되는지 확인합니다.
   - 게임 로드 시 바위가 생성되는지 확인합니다.

3. **오류 처리 테스트**:
   - HP UI 요소가 없는 경우 게임이 계속 실행되는지 확인합니다.
   - 맵 생성 중 오류가 발생해도 게임이 계속 실행되는지 확인합니다.

## 문제 원인 분석

### HP UI 문제 원인

코드 분석 결과, HP UI 문제의 가능한 원인은 다음과 같습니다:

1. **HTML 요소 ID 불일치**: HP 클래스에서 참조하는 HTML 요소 ID가 실제 HTML 구조와 일치하지 않을 수 있습니다.
2. **스크립트 로드 순서**: HP 클래스가 HTML 요소보다 먼저 초기화될 수 있습니다.
3. **CSS 가시성 문제**: CSS 스타일이 HP UI 요소를 숨길 수 있습니다.

### 맵 객체 생성 문제 원인

맵 객체 생성 문제의 가능한 원인은 다음과 같습니다:

1. **Map 클래스 로드 실패**: Map 클래스가 제대로 로드되지 않아 `this.map`이 undefined가 될 수 있습니다.
2. **THREE.js 의존성 문제**: Map 클래스가 THREE.js 객체에 의존하는데, THREE.js가 제대로 로드되지 않을 수 있습니다.
3. **메서드 호출 실패**: `generateMap` 메서드가 호출되지 않거나 오류가 발생할 수 있습니다.

## 해결 방안

### HP UI 문제 해결 방안

ForCompare 폴더의 코드 구조와 변수를 최대한 유지하면서 문제를 해결하는 것이 중요합니다. 따라서 다음과 같은 접근 방식을 사용합니다:

1. **HP 클래스 구조 유지**:
   ForCompare 폴더의 HP 클래스 구조를 기반으로 하되, 필요한 오류 처리만 추가합니다.
   ```javascript
   constructor(maxHP) {
     this.maxHP_ = maxHP;
     this.currentHP_ = maxHP;
     this.hpBar_ = document.getElementById('hp-bar');
     this.hpText_ = document.getElementById('hp-text');
     
     // 요소 존재 확인 및 오류 처리
     if (!this.hpBar_ || !this.hpText_) {
       console.error('HP UI elements not found');
     } else {
       this.UpdateHPBar_();
     }
   }
   ```

2. **UpdateHPBar_ 메서드 안전 처리**:
   ```javascript
   UpdateHPBar_() {
     if (!this.hpBar_ || !this.hpText_) return;
     
     const percent = this.Percent * 100;
     this.hpBar_.style.width = `${percent}%`;
     this.hpText_.innerText = `${this.currentHP_} / ${this.maxHP_}`;
   }
   ```

### 맵 객체 생성 문제 해결 방안

1. **ForCompare의 InitBuildings_ 메서드 복원**:
   현재 버전에서는 Map 클래스를 사용하지만, 문제 해결을 위해 ForCompare 버전의 InitBuildings_ 메서드를 복원하는 방법을 고려할 수 있습니다.
   ```javascript
   InitBuildings_() {
     // Create some random buildings
     for (let i = 0; i < 20; i++) {
       const width = Math.random() * 5 + 5;
       const height = Math.random() * 10 + 5;
       const depth = Math.random() * 5 + 5;
       const geometry = new THREE.BoxGeometry(width, height, depth);
       const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
       const building = new THREE.Mesh(geometry, material);
       const x = Math.random() * 80 - 40;
       const z = Math.random() * 80 - 40;
       building.position.set(x, height / 2, z);
       this.scene_.add(building);
     }
   }
   ```

2. **Map 클래스 사용 시 안전 처리**:
   Map 클래스를 계속 사용하는 경우, 다음과 같이 안전 처리를 추가합니다.
   ```javascript
   InitMap_() {
     try {
       if (typeof Map === 'undefined') {
         console.error('Map class is not defined');
         // ForCompare 방식으로 폴백
         this.InitBuildings_();
         return;
       }
       this.map = new Map(this.scene_);
       this.map.generateMap();
     } catch (error) {
       console.error('Error initializing map:', error);
       // ForCompare 방식으로 폴백
       this.InitBuildings_();
     }
   }
   ```

3. **스크립트 로드 순서 확인**:
   ForCompare 폴더의 index.html 파일에서 사용하는 스크립트 로드 순서를 참고하여 수정합니다.
   ```html
   <script src="math.js"></script>
   <script src="object.js"></script>
   <script src="hp.js"></script>
   <script src="player.js"></script>
   <script src="map.js"></script>
   <script src="main.js"></script>
   ```