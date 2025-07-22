# Design Document

## Overview

이 설계 문서는 현재 게임에서 발생하는 여러 주요 문제를 해결하기 위한 접근 방식을 설명합니다:

### UI 문제
1. HP UI가 표시되지 않는 문제
2. 맵 객체(건물, 나무, 바위 등)가 생성되지 않는 문제

### 멀티플레이어 동기화 문제
1. 상대방의 애니메이션이 항상 'Idle' 상태로만 표시되는 문제
2. 캐릭터 선택이 다른 플레이어에게 올바르게 적용되지 않는 문제
3. 공격 동작과 데미지가 다른 플레이어에게 동기화되지 않는 문제

이러한 문제들은 코드 분석을 통해 식별되었으며, 이 문서에서는 문제의 원인과 해결 방법을 설명합니다.

## Architecture

현재 게임 아키텍처는 다음과 같은 주요 구성 요소로 이루어져 있습니다:

1. **Game 클래스**: 게임의 메인 클래스로, 렌더링, 업데이트 루프, 초기화 등을 담당합니다.
2. **Player 클래스**: 플레이어 캐릭터의 동작, 상태, 입력 처리 등을 담당합니다.
3. **HP 클래스**: 플레이어의 체력 상태와 UI 표시를 담당합니다.
4. **Map 클래스**: 게임 맵과 객체(건물, 나무, 바위 등) 생성을 담당합니다.
5. **네트워크 통신 모듈**: 멀티플레이어 게임에서 플레이어 간 데이터 동기화를 담당합니다.

이 구성 요소들은 서로 상호작용하여 게임 경험을 제공합니다. 문제 해결을 위해 이 아키텍처를 수정하지 않고, 기존 구성 요소 내에서 버그를 수정할 것입니다.

## Components and Interfaces

### UI 문제 해결

#### HP UI 문제 해결

HP UI 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **HP 클래스**: 
   - `constructor`: HTML 요소를 가져와 초기화합니다.
   - `UpdateHPBar_`: HP 바와 텍스트를 업데이트합니다.

2. **HTML 구조**:
   - `hp-bar`: HP 바를 표시하는 요소
   - `hp-text`: HP 텍스트를 표시하는 요소

#### 맵 객체 생성 문제 해결

맵 객체 생성 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **Game 클래스**:
   - `InitMap_`: Map 클래스를 초기화하고 맵 생성을 호출합니다.

2. **Map 클래스**:
   - `generateMap`: 맵 객체(건물, 나무, 바위 등)를 생성합니다.
   - `createBuildings`: 건물을 생성합니다.
   - `createDecorations`: 나무와 바위를 생성합니다.

### 멀티플레이어 동기화 문제 해결

#### 애니메이션 동기화 문제 해결

애니메이션 동기화 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **Player 클래스**:
   - `UpdateAnimation_`: 플레이어의 현재 상태에 따라 애니메이션을 업데이트합니다.
   - `SetState`: 플레이어의 상태를 설정합니다.

2. **네트워크 통신 모듈**:
   - 플레이어 상태 정보를 전송하고 수신하는 기능을 담당합니다.
   - 다른 플레이어의 상태 변경을 감지하고 해당 플레이어 객체에 적용합니다.

#### 캐릭터 선택 동기화 문제 해결

캐릭터 선택 동기화 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **대기방 UI**:
   - 플레이어가 캐릭터를 선택할 수 있는 인터페이스를 제공합니다.

2. **Game 클래스**:
   - `InitPlayers_`: 게임 시작 시 플레이어 객체를 초기화합니다.
   - 선택된 캐릭터 정보를 저장하고 적용합니다.

3. **네트워크 통신 모듈**:
   - 캐릭터 선택 정보를 다른 플레이어에게 전송합니다.
   - 다른 플레이어의 캐릭터 선택 정보를 수신하고 적용합니다.

#### 공격 동기화 문제 해결

공격 동기화 문제는 다음과 같은 구성 요소와 관련이 있습니다:

1. **Player 클래스**:
   - `Attack`: 플레이어의 공격 동작을 처리합니다.
   - `TakeDamage`: 플레이어가 데미지를 입을 때 호출됩니다.

2. **attackSystem 클래스**:
   - 공격 판정과 데미지 계산을 담당합니다.

3. **네트워크 통신 모듈**:
   - 공격 정보(위치, 방향, 데미지 등)를 다른 플레이어에게 전송합니다.
   - 다른 플레이어의 공격 정보를 수신하고 처리합니다.

## Error Handling

### UI 문제 오류 처리

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

### 멀티플레이어 동기화 문제 오류 처리

1. **애니메이션 상태 동기화 오류 처리**:
   - 네트워크를 통해 애니메이션 상태 데이터를 수신할 때 유효성을 검사합니다.
   - 유효하지 않은 상태 데이터를 수신한 경우 기본 상태('Idle')로 설정하고 오류를 기록합니다.
   - 네트워크 연결이 끊어진 경우 로컬 상태를 유지하고 재연결 시도를 합니다.

2. **캐릭터 선택 동기화 오류 처리**:
   - 캐릭터 선택 정보가 손실된 경우 기본 캐릭터를 할당합니다.
   - 대기방에서 게임으로 전환될 때 캐릭터 선택 정보를 세션 스토리지에 저장하여 백업합니다.
   - 게임 시작 시 캐릭터 선택 정보를 확인하고, 없는 경우 기본값을 사용합니다.

3. **공격 동기화 오류 처리**:
   - 공격 정보 전송 실패 시 재시도 메커니즘을 구현합니다.
   - 공격 판정 시 클라이언트 간 시간 지연을 고려하여 타임스탬프를 포함합니다.
   - 충돌하는 공격 정보가 수신된 경우 서버 또는 호스트의 판정을 우선시합니다.

## Testing Strategy

### UI 문제 테스트 전략

다음과 같은 테스트 전략을 사용하여 UI 문제 수정 사항을 검증합니다:

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

### 멀티플레이어 동기화 문제 테스트 전략

다음과 같은 테스트 전략을 사용하여 멀티플레이어 동기화 문제 수정 사항을 검증합니다:

1. **애니메이션 동기화 테스트**:
   - 두 클라이언트를 연결하고 한 클라이언트에서 이동, 공격, 점프 등의 동작을 수행합니다.
   - 다른 클라이언트에서 해당 동작에 맞는 애니메이션이 표시되는지 확인합니다.
   - 네트워크 지연 상황에서도 애니메이션이 올바르게 동기화되는지 확인합니다.

2. **캐릭터 선택 동기화 테스트**:
   - 대기방에서 각 플레이어가 다른 캐릭터를 선택합니다.
   - 게임 시작 후 각 플레이어가 선택한 캐릭터로 게임에 참여하는지 확인합니다.
   - 게임 중간에 플레이어가 나가고 다시 들어와도 캐릭터 선택이 유지되는지 확인합니다.

3. **공격 동기화 테스트**:
   - 한 클라이언트에서 공격을 수행하고 다른 클라이언트에서 해당 공격이 시각적으로 표시되는지 확인합니다.
   - 공격 범위 내에 있는 플레이어가 데미지를 입는지 확인합니다.
   - HP UI가 데미지 적용 후 올바르게 업데이트되는지 확인합니다.
   - 여러 플레이어가 동시에 공격할 때 모든 공격이 올바르게 처리되는지 확인합니다.

4. **네트워크 오류 복구 테스트**:
   - 네트워크 연결이 일시적으로 끊어진 후 다시 연결되었을 때 게임 상태가 올바르게 동기화되는지 확인합니다.
   - 패킷 손실 상황에서 게임이 계속 진행되는지 확인합니다.

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

### 애니메이션 동기화 문제 원인

애니메이션 동기화 문제의 가능한 원인은 다음과 같습니다:

1. **상태 정보 전송 누락**: 플레이어의 상태 정보(이동, 공격, 점프 등)가 네트워크를 통해 전송되지 않거나 불완전하게 전송될 수 있습니다.
2. **상태 업데이트 로직 오류**: 다른 플레이어의 상태 정보를 수신했을 때 해당 플레이어 객체의 상태를 업데이트하는 로직에 오류가 있을 수 있습니다.
3. **애니메이션 상태 매핑 오류**: 수신된 상태 정보가 올바른 애니메이션 상태로 매핑되지 않을 수 있습니다.

### 캐릭터 선택 동기화 문제 원인

캐릭터 선택 동기화 문제의 가능한 원인은 다음과 같습니다:

1. **캐릭터 선택 정보 저장 실패**: 대기방에서 선택한 캐릭터 정보가 제대로 저장되지 않을 수 있습니다.
2. **캐릭터 선택 정보 전송 실패**: 선택한 캐릭터 정보가 다른 플레이어에게 전송되지 않거나 불완전하게 전송될 수 있습니다.
3. **캐릭터 할당 로직 오류**: 게임 시작 시 각 플레이어에게 캐릭터를 할당하는 로직에 오류가 있을 수 있습니다.

### 공격 동기화 문제 원인

공격 동기화 문제의 가능한 원인은 다음과 같습니다:

1. **공격 정보 전송 누락**: 공격 정보(위치, 방향, 데미지 등)가 네트워크를 통해 전송되지 않거나 불완전하게 전송될 수 있습니다.
2. **공격 시각화 로직 오류**: 다른 플레이어의 공격 정보를 수신했을 때 해당 공격을 시각적으로 표시하는 로직에 오류가 있을 수 있습니다.
3. **데미지 적용 로직 오류**: 공격 범위 내에 있는 플레이어에게 데미지를 적용하는 로직에 오류가 있을 수 있습니다.

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

### 애니메이션 동기화 문제 해결 방안

1. **상태 정보 전송 확인 및 수정**:
   플레이어의 상태 정보가 네트워크를 통해 올바르게 전송되도록 수정합니다.
   ```javascript
   // 플레이어 상태 변경 시 네트워크로 전송
   SetState(state) {
     this.state_ = state;
     
     // 네트워크를 통해 상태 정보 전송
     if (this.isLocalPlayer_ && this.socket_) {
       this.socket_.emit('player-state-change', {
         id: this.id_,
         state: this.state_
       });
     }
   }
   ```

2. **상태 업데이트 로직 수정**:
   다른 플레이어의 상태 정보를 수신했을 때 해당 플레이어 객체의 상태를 올바르게 업데이트하도록 수정합니다.
   ```javascript
   // 다른 플레이어의 상태 정보 수신 처리
   socket.on('player-state-change', (data) => {
     const player = this.players_.find(p => p.id_ === data.id);
     if (player && !player.isLocalPlayer_) {
       console.log(`Received state change for player ${data.id}: ${data.state}`);
       player.state_ = data.state;
       // 애니메이션 즉시 업데이트
       player.UpdateAnimation_();
     }
   });
   ```

3. **애니메이션 상태 매핑 수정**:
   수신된 상태 정보가 올바른 애니메이션 상태로 매핑되도록 수정합니다.
   ```javascript
   UpdateAnimation_() {
     // 상태에 따라 애니메이션 설정
     switch (this.state_) {
       case 'idle':
         this.PlayAnimation_('Idle');
         break;
       case 'walk':
         this.PlayAnimation_('Walk');
         break;
       case 'attack':
         this.PlayAnimation_('Attack');
         break;
       case 'jump':
         this.PlayAnimation_('Jump');
         break;
       default:
         this.PlayAnimation_('Idle');
         break;
     }
   }
   ```

### 캐릭터 선택 동기화 문제 해결 방안

1. **캐릭터 선택 정보 저장 개선**:
   대기방에서 선택한 캐릭터 정보를 로컬 스토리지와 서버 모두에 저장하여 안정성을 높입니다.
   ```javascript
   // 캐릭터 선택 처리
   selectCharacter(characterType) {
     // 로컬 스토리지에 저장
     localStorage.setItem('selectedCharacter', characterType);
     
     // 서버에 전송
     this.socket_.emit('character-select', {
       id: this.socket_.id,
       characterType: characterType
     });
   }
   ```

2. **게임 시작 시 캐릭터 할당 로직 수정**:
   게임 시작 시 각 플레이어에게 대기방에서 선택한 캐릭터를 올바르게 할당하도록 수정합니다.
   ```javascript
   // 게임 시작 시 플레이어 초기화
   InitPlayers_(playerData) {
     playerData.forEach(data => {
       const isLocalPlayer = data.id === this.socket_.id;
       const characterType = data.characterType || 'default';
       
       // 플레이어 생성 시 캐릭터 타입 전달
       const player = new Player(this.scene_, data.id, characterType, isLocalPlayer);
       this.players_.push(player);
       
       // 로컬 플레이어인 경우 카메라 설정
       if (isLocalPlayer) {
         this.camera_.follow(player);
       }
     });
   }
   ```

3. **캐릭터 선택 정보 동기화 개선**:
   다른 플레이어의 캐릭터 선택 정보를 수신하고 적용하는 로직을 개선합니다.
   ```javascript
   // 다른 플레이어의 캐릭터 선택 정보 수신
   socket.on('character-select', (data) => {
     console.log(`Player ${data.id} selected character: ${data.characterType}`);
     
     // 대기방 UI 업데이트
     this.updateWaitingRoomUI(data.id, data.characterType);
     
     // 게임 중인 경우 플레이어 캐릭터 업데이트
     if (this.gameStarted_) {
       const player = this.players_.find(p => p.id_ === data.id);
       if (player) {
         player.UpdateCharacterModel_(data.characterType);
       }
     }
   });
   ```

### 공격 동기화 문제 해결 방안

1. **공격 정보 전송 개선**:
   공격 정보를 네트워크를 통해 올바르게 전송하도록 수정합니다.
   ```javascript
   // 공격 수행 시 네트워크로 전송
   Attack() {
     // 로컬 공격 처리
     this.state_ = 'attack';
     this.UpdateAnimation_();
     
     // 공격 정보 생성
     const attackInfo = {
       id: this.id_,
       position: {
         x: this.position_.x,
         y: this.position_.y,
         z: this.position_.z
       },
       direction: this.direction_,
       timestamp: Date.now(),
       attackType: this.currentWeapon_.type
     };
     
     // 네트워크를 통해 공격 정보 전송
     if (this.isLocalPlayer_ && this.socket_) {
       this.socket_.emit('player-attack', attackInfo);
     }
     
     // 공격 판정 및 이펙트 생성
     this.CreateAttackEffect_(attackInfo);
   }
   ```

2. **공격 시각화 로직 개선**:
   다른 플레이어의 공격 정보를 수신했을 때 해당 공격을 시각적으로 표시하는 로직을 개선합니다.
   ```javascript
   // 다른 플레이어의 공격 정보 수신 처리
   socket.on('player-attack', (attackInfo) => {
     console.log(`Received attack from player ${attackInfo.id}`);
     
     // 공격한 플레이어 찾기
     const attacker = this.players_.find(p => p.id_ === attackInfo.id);
     
     if (attacker && !attacker.isLocalPlayer_) {
       // 플레이어 상태 및 애니메이션 업데이트
       attacker.state_ = 'attack';
       attacker.UpdateAnimation_();
       
       // 공격 이펙트 생성
       attacker.CreateAttackEffect_(attackInfo);
     }
   });
   ```

3. **데미지 적용 로직 개선**:
   공격 범위 내에 있는 플레이어에게 데미지를 적용하는 로직을 개선합니다.
   ```javascript
   // 공격 이펙트 생성 및 데미지 판정
   CreateAttackEffect_(attackInfo) {
     // 공격 이펙트 생성 (시각적 표현)
     const effect = new AttackEffect(this.scene_, attackInfo);
     
     // 데미지 판정
     this.game_.players_.forEach(player => {
       // 자기 자신은 제외
       if (player.id_ === attackInfo.id) return;
       
       // 공격 범위 내에 있는지 확인
       const distance = Math.sqrt(
         Math.pow(player.position_.x - attackInfo.position.x, 2) +
         Math.pow(player.position_.z - attackInfo.position.z, 2)
       );
       
       // 공격 범위 내에 있으면 데미지 적용
       if (distance <= attackInfo.attackType.range) {
         // 로컬 플레이어인 경우 데미지 적용
         if (player.isLocalPlayer_) {
           player.TakeDamage(attackInfo.attackType.damage);
         }
         
         // 데미지 정보 전송 (호스트 또는 서버 권한)
         if (this.isHost_ || this.isServer_) {
           this.socket_.emit('player-damage', {
             attackerId: attackInfo.id,
             targetId: player.id_,
             damage: attackInfo.attackType.damage,
             timestamp: attackInfo.timestamp
           });
         }
       }
     });
   }
   ```