# ADR-0025 — Duru 서비스 표시명

- 상태: 채택
- 날짜: 2026-09-14
- 다루는 축: 사용자 표시명, 네이티브 제품명과 기존 기술 식별자의 호환성 경계

## 맥락

이 저장소는 사용자 대면 클라이언트를 만들면서도 서비스명을 정하지 않은 채 시작했다
(ADR-0001 D1). 앱 디렉터리와 네이티브 타깃은 서비스명이 아니라 역할과 타깃을 나타내는
`mobile`·`ios`·`Host`로 지었다(ADR-0002 D4). package, 디자인 토큰, bundle identifier,
영속 저장소, 성능 수집에는 이미 `libitum` 또는 `libitums`가 들어간 기술 식별자가 있다.

서비스명이 **Duru**로 정해졌다. 사용자가 iOS 홈 화면과 App Library에서 보는 이름에는
이를 반영해야 하지만, 서비스 표시명을 정한 일이 기존 기술 식별자의 전면 개명을 뜻하지는
않는다. 둘을 구분하지 않으면 package 설치, 앱 업데이트 연속성, 저장 데이터 조회, 성능
수집 연결이 서비스명 변경과 함께 깨질 수 있다.

## 결정

### D1. iOS 사용자 표시명은 정확히 `Duru`다

`apps/ios/Host/Info.plist`의 `CFBundleDisplayName`을 대소문자까지 정확히 `Duru`로 둔다.
Debug와 Release로 빌드한 앱 모두 이 값을 bundle metadata에 담고, iOS 17.4 이상에서
홈 화면과 App Library의 앱 라벨로 제공한다. 현 범위에서는 지역화된 다른 이름을 두지
않는다.

### D2. `Host`는 네이티브 기술 이름으로 유지한다

Xcode target, scheme, product, executable, module, directory와 project 이름은 `Host`다.
이는 앱이 Lynx bundle을 싣는 역할을 나타내는 기술 이름이고 사용자 표시명이 아니다.
서비스명이 바뀌어도 이 이름을 `Duru`로 개명하지 않는다.

### D3. 기존 `libitum`·`libitums` 기술 식별자를 유지한다

아래 값은 서비스명이 아니라 조직, 호환성 또는 데이터 연속성을 지는 식별자다. Duru로
치환하거나 별칭을 만들지 않는다.

| 경계 | 유지하는 값 |
|---|---|
| npm/workspace package | `@libitums/*` (`@libitums/mobile`, `@libitums/design-tokens`, `@libitums/icons` 포함) |
| CSS custom property | `--libitum-*` |
| iOS application/test bundle | `com.libitum.host`, `com.libitum.host.tests` |
| 영속 저장소 key | `libitum.` 접두사 |
| 성능 수집 | `libitum:navigation:`, `com.libitum.performance-capture` |
| 저장소 소유자 | `libitums/FE` 같은 GitHub owner 표기 |

역사적 URL, package 예시, 명령, 성능 보고서에 있는 같은 문자열도 당시 사실 또는 현재
기술 경계를 나타내므로 브랜드 문구처럼 일괄 교체하지 않는다.

### D4. 표시명과 호환성 경계를 함께 검증한다

검증은 `CFBundleDisplayName=Duru`만 확인하고 끝내지 않는다. Release bundle에 반영된
표시명, 기존 `com.libitum.host` bundle identifier, 설치와 실행을 함께 확인한다. 재현
절차와 기록 항목의 정본은 [서비스명 수동 E2E](../e2e/service-name.md)다.

## 버린 대안

- **`Host` 타깃과 제품도 Duru로 개명한다** — 사용자에게 보이지 않는 프로젝트 경계를
  함께 흔들고, 표시명 변경에 필요하지 않은 Xcode 설정과 경로 변경을 만든다.
- **`libitum`·`libitums` 문자열을 모두 Duru로 바꾼다** — package scope와 저장소 owner는
  조직이 소유하고, bundle ID·저장소 key·성능 식별자는 기존 설치와 데이터의 연속성을
  가진다. 사용자 문구와 기술 호환성을 한 번에 바꿀 근거가 없다.
- **표시명을 `Host`에 둔다** — 내부 역할명이 사용자에게 노출되고, 결정된 서비스명이
  iOS 설치면에 반영되지 않는다.

## 대가

- 코드와 문서에는 Duru와 `libitum`·`libitums`가 함께 남는다. 문자열만 검색하면 개명이
  덜 된 것처럼 보일 수 있어, 쓰임새가 사용자 문구인지 기술 식별자인지 확인해야 한다.
- 서비스명과 bundle identifier가 다르므로 네이티브 빌드 문제를 조사할 때 두 이름을
  구분해야 한다.
- 지역화가 필요해지면 단일 `CFBundleDisplayName` 결정만으로는 부족하다.

## 재검토 조건

- 서비스 표시명이 다시 바뀌면 D1과 사용자 대면 문구를 새 ADR에서 다시 정한다.
- iOS 앱을 새 bundle identifier로 별도 출시하거나 기존 설치·데이터 호환성을 끊는
  migration 요구가 생기면 D2·D3을 함께 다시 본다.
- 서비스명 지역화가 요구되면 `InfoPlist.strings` 소유와 locale별 fallback을 새로 정한다.
