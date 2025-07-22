# Design Document: Character Selection Integration

## Overview

This design document outlines the approach for integrating the character selection functionality from the external characterSelection.js file directly into the index.html file. The integration will eliminate the need for a separate JavaScript file while maintaining all existing functionality.

## Architecture

The current architecture separates the character selection code into an external JavaScript file (characterSelection.js) that is not properly referenced in the HTML file. The new architecture will consolidate this code directly into the index.html file within a script tag, following the pattern used in the reference repository.

### Current Structure:
- index.html: Contains partial character selection code in script tags
- characterSelection.js: Contains the complete character selection functionality
- No direct reference to characterSelection.js in index.html

### Target Structure:
- index.html: Will contain all character selection code within script tags
- characterSelection.js: Will be removed after integration

## Components and Interfaces

### Character Selection Component

The character selection functionality consists of the following key components that need to be integrated:

1. **DOM Element Selection**:
   - Character cards selection
   - Preview character name display
   - Nickname input field
   - Enter button

2. **Three.js Initialization**:
   - Canvas setup
   - Scene, camera, and renderer configuration
   - Lighting setup
   - Camera positioning
   - OrbitControls configuration

3. **Model Loading and Animation**:
   - glTF loader initialization
   - Model loading function
   - Animation mixer setup
   - Animation loop

4. **Event Handlers**:
   - Character click events
   - Enter button click event
   - Character selection initialization function

### Integration Points

The integration will focus on these specific points:

1. **Script Tag Placement**: The integrated code will be placed within a script tag at the end of the body section in index.html, before other script imports.

2. **DOM References**: Ensure all DOM element references are correctly maintained during integration.

3. **Event Binding**: Preserve all event listeners and their functionality.

4. **Global Function Exposure**: Maintain the global exposure of the initialization function (window.initializeCharacterSelection).

## Data Models

The character selection functionality uses the following key data structures:

1. **Character Selection State**:
   ```javascript
   let selectedChar = null; // Currently selected character element
   ```

2. **Three.js Components**:
   ```javascript
   const scene = new THREE.Scene();
   const camera = new THREE.PerspectiveCamera(60, 320 / 420, 0.1, 1000);
   const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
   const controls = new THREE.OrbitControls(camera, renderer.domElement);
   const loader = new THREE.GLTFLoader();
   let currentModel = null;
   let mixer = null;
   ```

These data structures will be maintained in the integrated code.

## Error Handling

The integration will preserve the existing error handling mechanisms:

1. **Model Loading Errors**: The current error handling for glTF model loading will be maintained:
   ```javascript
   loader.load(
     gltfPath,
     (gltf) => { /* Success handler */ },
     undefined,
     (error) => {
       console.error('glTF 로드 오류:', error);
     }
   );
   ```

2. **Character Selection Validation**: The validation before proceeding with character selection will be preserved:
   ```javascript
   if (!selectedChar) {
     alert('캐릭터를 선택해주세요.');
     return;
   }
   ```

## Testing Strategy

The integration will be tested using the following approach:

1. **Functional Testing**:
   - Verify that all characters can be selected
   - Confirm that the 3D model preview works correctly
   - Ensure the nickname input field functions properly
   - Validate that the enter button correctly triggers the character selection event

2. **Visual Testing**:
   - Confirm that the character selection UI appears correctly
   - Verify that the selected character is visually highlighted
   - Ensure the 3D model preview renders properly

3. **Integration Testing**:
   - Verify that the character selection process integrates correctly with the rest of the game flow
   - Confirm that the character selection event is properly dispatched and handled

## Implementation Plan

1. **Code Analysis**:
   - Compare the content of characterSelection.js with the script tags in index.html
   - Identify any differences or missing functionality

2. **Integration**:
   - Copy the complete code from characterSelection.js
   - Replace the partial script tag content in index.html with the complete code
   - Ensure all DOM references and event bindings are correctly maintained

3. **Verification**:
   - Test the character selection functionality to ensure it works as expected
   - Verify that all 3D model previews load correctly
   - Confirm that character selection events are properly dispatched

4. **Clean-up**:
   - Remove the characterSelection.js file after successful integration and verification

# 설계 문서: 캐릭터 선택 통합

## 개요

이 설계 문서는 외부 characterSelection.js 파일의 캐릭터 선택 기능을 index.html 파일에 직접 통합하는 접근 방식을 설명합니다. 이 통합은 별도의 JavaScript 파일의 필요성을 제거하면서 모든 기존 기능을 유지할 것입니다.

## 아키텍처

현재 아키텍처는 캐릭터 선택 코드를 HTML 파일에서 제대로 참조되지 않는 외부 JavaScript 파일(characterSelection.js)로 분리하고 있습니다. 새로운 아키텍처는 이 코드를 참조 저장소에서 사용된 패턴을 따라 script 태그 내에 직접 통합할 것입니다.

### 현재 구조:
- index.html: script 태그 내에 부분적인 캐릭터 선택 코드 포함
- characterSelection.js: 완전한 캐릭터 선택 기능 포함
- index.html에서 characterSelection.js에 대한 직접적인 참조 없음

### 목표 구조:
- index.html: script 태그 내에 모든 캐릭터 선택 코드 포함
- characterSelection.js: 통합 후 제거됨

## 컴포넌트 및 인터페이스

### 캐릭터 선택 컴포넌트

캐릭터 선택 기능은 통합되어야 할 다음과 같은 주요 컴포넌트로 구성됩니다:

1. **DOM 요소 선택**:
   - 캐릭터 카드 선택
   - 미리보기 캐릭터 이름 표시
   - 닉네임 입력 필드
   - 입장 버튼

2. **Three.js 초기화**:
   - 캔버스 설정
   - 씬, 카메라, 렌더러 구성
   - 조명 설정
   - 카메라 위치 지정
   - OrbitControls 구성

3. **모델 로딩 및 애니메이션**:
   - glTF 로더 초기화
   - 모델 로딩 함수
   - 애니메이션 믹서 설정
   - 애니메이션 루프

4. **이벤트 핸들러**:
   - 캐릭터 클릭 이벤트
   - 입장 버튼 클릭 이벤트
   - 캐릭터 선택 초기화 함수

### 통합 지점

통합은 다음과 같은 특정 지점에 초점을 맞출 것입니다:

1. **스크립트 태그 배치**: 통합된 코드는 index.html의 body 섹션 끝에 다른 스크립트 임포트 전에 script 태그 내에 배치될 것입니다.

2. **DOM 참조**: 통합 과정에서 모든 DOM 요소 참조가 올바르게 유지되도록 합니다.

3. **이벤트 바인딩**: 모든 이벤트 리스너와 그 기능을 보존합니다.

4. **전역 함수 노출**: 초기화 함수(window.initializeCharacterSelection)의 전역 노출을 유지합니다.

## 데이터 모델

캐릭터 선택 기능은 다음과 같은 주요 데이터 구조를 사용합니다:

1. **캐릭터 선택 상태**:
   ```javascript
   let selectedChar = null; // 현재 선택된 캐릭터 요소
   ```

2. **Three.js 컴포넌트**:
   ```javascript
   const scene = new THREE.Scene();
   const camera = new THREE.PerspectiveCamera(60, 320 / 420, 0.1, 1000);
   const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
   const controls = new THREE.OrbitControls(camera, renderer.domElement);
   const loader = new THREE.GLTFLoader();
   let currentModel = null;
   let mixer = null;
   ```

이러한 데이터 구조는 통합된 코드에서 유지될 것입니다.

## 오류 처리

통합은 기존의 오류 처리 메커니즘을 보존할 것입니다:

1. **모델 로딩 오류**: glTF 모델 로딩에 대한 현재 오류 처리가 유지될 것입니다:
   ```javascript
   loader.load(
     gltfPath,
     (gltf) => { /* 성공 핸들러 */ },
     undefined,
     (error) => {
       console.error('glTF 로드 오류:', error);
     }
   );
   ```

2. **캐릭터 선택 유효성 검사**: 캐릭터 선택을 진행하기 전의 유효성 검사가 보존될 것입니다:
   ```javascript
   if (!selectedChar) {
     alert('캐릭터를 선택해주세요.');
     return;
   }
   ```

## 테스트 전략

통합은 다음과 같은 접근 방식으로 테스트될 것입니다:

1. **기능 테스트**:
   - 모든 캐릭터를 선택할 수 있는지 확인
   - 3D 모델 미리보기가 올바르게 작동하는지 확인
   - 닉네임 입력 필드가 제대로 기능하는지 확인
   - 입장 버튼이 캐릭터 선택 이벤트를 올바르게 트리거하는지 검증

2. **시각적 테스트**:
   - 캐릭터 선택 UI가 올바르게 표시되는지 확인
   - 선택된 캐릭터가 시각적으로 강조되는지 확인
   - 3D 모델 미리보기가 제대로 렌더링되는지 확인

3. **통합 테스트**:
   - 캐릭터 선택 프로세스가 게임 흐름의 나머지 부분과 올바르게 통합되는지 확인
   - 캐릭터 선택 이벤트가 제대로 발송되고 처리되는지 확인

## 구현 계획

1. **코드 분석**:
   - characterSelection.js의 내용과 index.html의 script 태그를 비교
   - 차이점이나 누락된 기능 식별

2. **통합**:
   - characterSelection.js에서 완전한 코드 복사
   - index.html의 부분적인 script 태그 내용을 완전한 코드로 대체
   - 모든 DOM 참조와 이벤트 바인딩이 올바르게 유지되도록 보장

3. **검증**:
   - 캐릭터 선택 기능이 예상대로 작동하는지 테스트
   - 모든 3D 모델 미리보기가 올바르게 로드되는지 확인
   - 캐릭터 선택 이벤트가 제대로 발송되는지 확인

4. **정리**:
   - 성공적인 통합 및 검증 후 characterSelection.js 파일 제거