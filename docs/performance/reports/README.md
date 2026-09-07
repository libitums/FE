# Lynx 성능 분석 기록

이 디렉터리는 팀이 다시 찾고 비교할 **정제된 분석 기록**을 둔다. 원본 JSON/NDJSON 캡처,
CLI stdout 전체, Trace 파일, Instruments export를 보관하는 곳이 아니다.

## 언제 기록하는가

`apps/mobile/src/` 또는 사용자가 관찰하는 `apps/ios/` 동작을 바꾸는 기능 PR마다 영향받는
시나리오 기록을 하나 이상 같은 PR에 추가하거나 갱신한다. 화면 뼈대도 예외가 아니다.
문서·테스트·devtools만 바꾸고 앱 런타임과 번들에 영향을 주지 않는 PR에는 적용하지 않는다
([ADR-0018 D9](../../adr/0018-lynx-performance-analysis-boundary.md)).

과거 런타임 수집기가 없던 변경도 기록을 생략하지 않는다. 얻지 못한 값은 `미측정`과
이유를 적는다. **미측정 기록은 baseline이 아니며 성능 통과를 뜻하지 않는다.** iOS
수집기가 연결된 뒤에는 영향 시나리오의 측정을 `미측정`으로 대체할 수 없다. 수집 절차는
[`docs/performance-analysis.md`](../../performance-analysis.md)의 `performance:capture` 명령을
따른다.

Linux Verify는 이 의무를 모든 PR과 `main` push에서 자동 검사한다. 테스트 파일을 제외한
`apps/mobile/src/**` 또는 `apps/ios/**` 변경에 이 README가 아닌 보고서 Markdown 변경이
없으면 실패한다. CI는 보고서를 대신 만들거나 커밋하지 않는다
([ADR-0021 D1·D2](../../adr/0021-performance-report-ci-automation.md)).

## 파일 규칙

파일 하나는 기기·시나리오·실행 회차 하나다.

```text
<scenario>-<device>-<run>.md
```

영문 소문자 kebab-case를 쓰고 실행 회차는 두 자리 숫자로 적는다.

```text
journey-map-scroll-iphone-13-mini-01.md
```

날짜는 파일명이나 문서 제목에 넣지 않고 본문의 `측정 일시`에만 기록한다. 같은 조건의
baseline을 여러 번 측정하면 scenario·device를 같게 두고 `01`, `02`, `03`처럼 회차만
올린다. 여러 회차를 한 파일에 합치지 않는다.

## 정책 검사

**PR 전 검사는 `pnpm verify`가 이미 돈다** — 정책 게이트가 그 마지막 단계다. 정책만
따로 다시 보고 싶으면 게이트를 직접 부른다. 비교할 두 commit을 지정해 소급 감사할
때는 아래쪽 명령을 쓴다.

```sh
pnpm performance:reports:gate                                # 지금 이 브랜치. 범위를 스스로 구한다
pnpm performance:reports:check --base <base> --head <head>   # 임의의 두 commit을 감사한다
```

둘은 같은 정책 코드를 부르고 **범위를 구하는 방법만** 다르다
([ADR-0021 D2](../../adr/0021-performance-report-ci-automation.md)).

검사는 다음을 확인한다.

- 사용자 관찰 가능 앱 변경과 보고서 변경이 같은 diff에 있는가
- 파일명과 첫 H1 제목에 날짜가 없고 날짜가 본문에만 있는가
- 상태, 대상 commit, 기기, OS, Lynx SDK, 빌드와 실행 조건·시나리오·분석 결과·해석 또는
  제한 사항·결론과 후속이 있는가
- 해석에 단일 실행, 미측정, 일반화 제한처럼 아직 판정할 수 없는 한계가 적혀 있는가
- 보고서 디렉터리에 JSON/NDJSON 원본이 추적되지 않고 Markdown에 로컬 절대 경로가 없는가
- `미측정` 기록을 baseline 또는 성능 통과로 주장하지 않는가

검사는 기록 형식과 누락만 판정한다. 수치 threshold를 적용하지 않고 raw capture를
artifact로 올리지 않으며 Markdown을 자동 생성하지 않는다. 보고서는 아래 양식으로 사람이
정제한다.

## 기록 양식

아래 양식을 복사한다. 측정하지 않은 항목은 지우지 말고 `해당 없음`과 이유를 적는다.

````markdown
# <시나리오> — <기기> — <회차>

## 실행 조건

- 측정 일시: <ISO 8601, 시간대 포함>
- 상태: <측정 / 미측정 — 사유>
- 기능 PR: <링크>
- 대상 commit: <전체 SHA>
- 기기: <모델, 실제 기기/시뮬레이터>
- OS: <이름과 버전>
- Lynx SDK: <버전>
- 빌드: <Debug/Release와 관련 옵션>
- 실행 회차: <01>

## 시나리오

- 전제: <시작 상태>
- 단계: <누가 다시 해도 같은 조작 순서와 횟수>
- 관찰 구간: <시작·종료 기준>

## 분석 결과

```text
<필요한 CLI 보고서 구간만 붙인다>
```

측정하지 못했다면 이 절에 수집하지 못한 항목, 이유, 당시 남아 있는 다른 검증을 적는다.
그 값을 추정하거나 `0`으로 쓰지 않는다.

## 비교

- 기준 기록: <없음 또는 저장소 상대 링크>
- 차이: <수치와 방향. 예산 판정이 아니면 pass/fail을 쓰지 않는다>

## 해석

<수치가 가리키는 병목 후보와 아직 말할 수 없는 것>

## Trace 후속 확인

- render: <확인 결과 또는 해당 없음과 이유>
- fluency: <확인 결과 또는 해당 없음과 이유>
- memory: <확인 결과 또는 해당 없음과 이유>
- NativeModule: <확인 결과 또는 해당 없음과 이유>

## 결론과 후속

- 결론: <재현 가능한 한 문장>
- 후속: <이슈/PR 링크 또는 없음>

## 정제 확인

- [ ] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [ ] 로컬 절대 경로와 계정 이름을 제거했다.
- [ ] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [ ] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [ ] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다.
````

## 기록하지 않는 것

- 원본 JSON/NDJSON 캡처와 검토 전 stdout
- URL, 요청 파라미터, NativeModule 파라미터
- 사용자 입력이나 콘텐츠를 식별할 수 있는 값
- 로컬 절대 경로와 계정 이름
- 근거가 정해지지 않은 성능 pass/fail

원본과 대용량 도구 산출물의 보존·전송이 필요해지면 먼저
[ADR-0018 D7](../../adr/0018-lynx-performance-analysis-boundary.md)을 재검토한다.
