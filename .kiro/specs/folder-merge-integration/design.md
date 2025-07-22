# 설계 문서

## 개요

현재 프로젝트는 두 개의 분리된 게임 버전을 가지고 있습니다:
1. **루트 디렉토리**: 단일 플레이어 게임 (고급 기능 포함 - 무기 시스템, 사운드, 이펙트 등)
2. **kkc-game-main**: 멀티플레이어 게임 (소켓 기반 네트워킹)

병합의 목표는 두 버전의 장점을 결합하여 고급 기능을 가진 멀티플레이어 전용 게임을 만드는 것입니다.

## 아키텍처

### 현재 상태 분석

#### 루트 디렉토리 (단일 플레이어 버전)
- **장점**: 
  - 고급 무기 시스템 (weapon_system.js)
  - 사운드 관리 (soundManager.js)
  - 시각적 이펙트 (effects.js)
  - 공격 시스템 (attackSystem.js)
  - 아이템 시스템 (item.js)
  - 향상된 UI 시스템 (ui.js)
- **단점**: 네트워킹 기능 없음

#### kkc-game-main (멀티플레이어 버전)
- **장점**: 
  - Socket.io 기반 멀티플레이어
  - 방 생성/참가 시스템
  - 실시간 플레이어 동기화
  - 게임 상태 관리
- **단점**: 기본적인 게임 기능만 구현

### 통합 아키텍처

```
프로젝트 루트/
├── server.js (멀티플레이어 서버)
├── package.json (통합된 의존성)
├── public/ (클라이언트 파일들)
│   ├── index.html (통합된 UI)
│   ├── main.js (통합된 게임 로직)
│   ├── player.js (향상된 플레이어 시스템)
│   ├── object.js (NPC 및 오브젝트)
│   ├── weapon_system.js (무기 시스템)
│   ├── soundManager.js (사운드 관리)
│   ├── effects.js (시각적 이펙트)
│   ├── attackSystem.js (공격 시스템)
│   ├── item.js (아이템 시스템)
│   ├── ui.js (UI 시스템)
│   ├── hp.js (HP 관리)
│   └── math.js (수학 유틸리티)
└── resources/ (게임 리소스)
```

## 컴포넌트 및 인터페이스

### 1. 서버 컴포넌트 (server.js)
- **역할**: 멀티플레이어 게임 세션 관리
- **기능**: 
  - 방 생성/참가 관리
  - 플레이어 상태 동기화
  - 게임 상태 브로드캐스팅
- **인터페이스**: Socket.io 이벤트 기반

### 2. 게임 엔진 (main.js)
- **역할**: 통합된 멀티플레이어 게임 로직 관리
- **기능**:
  - 멀티플레이어 전용 게임 시스템
  - 고급 게임 시스템 통합
  - 네트워크 동기화
- **인터페이스**: 
  ```javascript
  class GameStage3 {
    constructor(socket, players, map)
    Initialize()
    SetupNetworking() // 새로운 메서드
    IntegrateAdvancedSystems() // 새로운 메서드
  }
  ```

### 3. 플레이어 시스템 (player.js)
- **역할**: 플레이어 캐릭터 관리
- **통합 기능**:
  - 네트워크 동기화
  - 고급 무기 시스템
  - 사운드 및 이펙트
- **인터페이스**:
  ```javascript
  class Player {
    constructor(params)
    Update(delta, rotationAngle, collidables, isNetworked?)
    SyncNetworkState() // 새로운 메서드
    IntegrateWeaponSystem() // 새로운 메서드
  }
  ```

### 4. 네트워크 동기화 모듈
- **역할**: 클라이언트 간 상태 동기화
- **기능**:
  - 플레이어 위치/애니메이션 동기화
  - 무기 사용 동기화
  - 게임 이벤트 브로드캐스팅

## 데이터 모델

### 플레이어 상태
```javascript
{
  id: string,
  position: [x, y, z],
  rotation: [x, y, z],
  animation: string,
  hp: number,
  weapon: {
    type: string,
    state: string
  },
  stats: {
    speed: number,
    strength: number,
    agility: number,
    stamina: number
  }
}
```

### 게임 세션
```javascript
{
  roomId: string,
  players: Player[],
  gameState: {
    status: 'waiting' | 'playing' | 'ended',
    map: string,
    weapons: WeaponItem[],
    npcs: NPC[]
  },
  settings: {
    maxPlayers: number,
    roundTime: number,
    visibility: 'public' | 'private'
  }
}
```

## 오류 처리

### 1. 파일 충돌 해결
- **전략**: 기능 기반 병합
- **우선순위**: 
  1. 루트 버전의 고급 기능 우선
  2. kkc-game-main의 네트워킹 기능 보존
  3. 충돌 시 수동 병합 필요 부분 문서화

### 2. 네트워크 오류 처리
- **연결 실패**: 적절한 오류 메시지 표시 및 재연결 시도
- **동기화 오류**: 클라이언트 상태 재동기화
- **서버 오류**: 적절한 오류 메시지 표시

### 3. 호환성 문제
- **브라우저 호환성**: 모던 브라우저 지원
- **성능 최적화**: 네트워크 트래픽 최소화
- **메모리 관리**: 리소스 정리 및 가비지 컬렉션

## 테스트 전략

### 1. 단위 테스트
- 개별 시스템 기능 검증
- 네트워크 동기화 로직 테스트
- 게임 로직 정확성 검증

### 2. 통합 테스트
- 클라이언트-서버 통신 테스트
- 멀티플레이어 시나리오 테스트
- 게임 세션 라이프사이클 테스트

### 3. 성능 테스트
- 다중 플레이어 부하 테스트
- 네트워크 지연 시뮬레이션
- 메모리 사용량 모니터링

## 병합 전략

### 1. 파일 분석 및 분류
- **동일 파일**: 기능 비교 후 최적 버전 선택
- **고유 파일**: 적절한 위치로 이동
- **충돌 파일**: 수동 병합 필요

### 2. 의존성 통합
- package.json 병합
- 중복 의존성 제거
- 버전 충돌 해결

### 3. 코드 통합
- 네트워킹 기능을 기존 게임 로직에 통합
- 고급 시스템을 멀티플레이어 환경에 적응
- 인터페이스 표준화

### 4. 리소스 통합
- 중복 리소스 제거
- 경로 참조 업데이트
- 최적화된 리소스 구조 생성

## 마이그레이션 계획

### Phase 1: 구조 통합
- 폴더 구조 정리
- 기본 파일 병합
- 의존성 통합

### Phase 2: 기능 통합
- 네트워킹 기능 통합
- 고급 시스템 통합
- 인터페이스 조정

### Phase 3: 테스트 및 최적화
- 통합 테스트 실행
- 성능 최적화
- 버그 수정

### Phase 4: 검증 및 배포
- 최종 검증
- 문서화 업데이트
- 배포 준비