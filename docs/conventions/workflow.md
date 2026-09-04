# 작업 흐름

## 첫 설정

1. `corepack enable` — 꺼져 있으면 `packageManager` 고정이 무시되고 pnpm 버전이 갈린다.
2. `nvm use` — `.nvmrc`의 Node를 맞춘다. `engines`가 `>=22.12 <23`을 막아준다.
3. GitHub Packages 인증을 **저장소 밖**에 둔다. 없으면 `pnpm install`이 `@libitums/*`에서
   `401`로 죽는다.

   ```ini
   # ~/.npmrc  (저장소가 아니라 홈 디렉터리다)
   //npm.pkg.github.com/:_authToken=<GitHub PAT, scope: read:packages>
   ```

   **저장소 `.npmrc`에 넣으면 동작하지 않는다.** pnpm v10.34.2·v11.5.3부터 저장소가
   소유한 `.npmrc`의 인증 항목을 무시한다. 무시될 때
   ` WARN  Ignored project-level auth setting`이 뜬다. 저장소 `.npmrc`에는 registry
   연결 한 줄(`@libitums:registry=…`)만 커밋한다. `.env`에 넣어도 동작하지 않는다 —
   pnpm이 그 파일을 읽지 않는다.

   CI에서는 `actions/setup-node`가 **사용자 수준** `.npmrc`를 쓰므로 `NODE_AUTH_TOKEN`이
   그대로 동작한다.

([ADR-0005 D3](../adr/0005-runtime-and-package-manager-versions.md),
[ADR-0014 D3](../adr/0014-design-system-consumption-verified.md))

## 명령

| 명령 | 하는 일 | 하지 않는 일 |
|---|---|---|
| `pnpm dev` | rspeedy dev 서버. Explorer가 붙을 URL/QR | 타입 검사·린트 |
| `pnpm build` | Lynx 번들 산출 (`apps/mobile/dist/`) | **타입 검사** |
| `pnpm preview` | 빌드 산출물을 Explorer로 확인 | 빌드 |
| `pnpm typecheck` | `tsc --noEmit` | 코드 생성 |
| `pnpm lint` | 정적 검사 (`oxlint`) + **CSS 토큰 접두사 검사** (`lint:tokens` — ADR-0014 D8) | **자동 수정** (`lint:fix`가 따로) |
| `pnpm format` | 포맷 적용 (`oxfmt`) | 검사만 (`format:check`가 따로) |
| `pnpm bundle:host` | `build` + 호스트로 사본 복사 | 네이티브 빌드 |
| `pnpm test` | 앱 `test:unit` + `test:ui` + `test:integration`과 보고서 정책 테스트 | e2e |
| `pnpm performance:reports:check --base <base> --head <head>` | 두 commit 사이의 앱 변경과 성능 보고서 정책 검사 | 보고서 생성·성능 수치 판정 |
| `pnpm --filter @libitums/mobile performance:capture:smoke` | iOS Host 준비부터 수집·분석·cleanup까지 native 연결 확인 | 실기 baseline·수치 threshold |
| `pnpm verify` | format:check → typecheck → lint → test → build | 네이티브 빌드 |

- **한 명령은 한 가지 이유로만 실패한다.** 명령이 두 가지 일을 겸하게 만들지 않는다.
- 앱만 돌리려면 `pnpm --filter @libitums/mobile <cmd>`. 루트 스크립트는 `pnpm -r`이 아니라
  명시적 `--filter`를 쓴다 — 범위를 넓히는 것은 명시적 결정이어야 한다.
- CI도 **같은 저장소 스크립트**를 쓴다. 차이는 Git 비교 commit과 frozen install 같은
  실행 인자로만 준다.
- 네이티브 빌드는 `verify`에 들어가지 않는다. Xcode에서 돈다.

([ADR-0006 D1·D2·D3](../adr/0006-command-interface-and-test-layers.md),
[ADR-0012 D6](../adr/0012-native-host-app-minimal.md))

## PR

1. 브랜치를 판다. **`main`에 직접 push하지 않는다.**
2. PR 전 로컬에서 `pnpm verify`를 돌린다.
3. 사용자 대면 기능을 바꿨다면 영향 시나리오의 분석 기록을
   `docs/performance/reports/`에 같은 PR로 남긴다. 수집기가 없는 동안의 `미측정` 기록은
   허용하지만 baseline이나 성능 통과로 세지 않는다
   ([ADR-0018 D9](../adr/0018-lynx-performance-analysis-boundary.md)).
4. PR을 올리고 diff를 **사람이 읽는다.** 구현 상당 부분을 에이전트가 만들기 때문에
   이 지점이 구조적으로 필요하다.
5. **squash로 머지한다.** `main`의 커밋 하나 = PR 하나여야 `git revert <sha>` 하나로
   통째로 되돌릴 수 있다. 커밋 제목은 PR 제목을 쓴다.

> **CI는 있지만 이 절차는 required check로 강제되지 않는다.** 모든 PR과 `main` push에서
> Linux Verify가 `pnpm verify`와 보고서 정책을 실행한다. 관련 PR·수동·평일 정기 실행에는
> iOS performance smoke도 보이지만 초기에는 비차단이다. 저장소가 private이고 현재 플랜의
> branch protection API가 403이어서 실패한 검사도 우회할 수 있다. 강제되는 줄 알고
> 방심하지 않는다. (squash 고정은 예외 — GitHub 저장소 설정에서 켠 강제 수단이다.)

([ADR-0009 D4·D5·D6](../adr/0009-vcs-hygiene-ci-and-merge-gate.md),
[ADR-0020](../adr/0020-performance-report-ci-automation.md))

## 문서를 같은 PR에서 고친다

- 규약을 바꾸는 변경 → `docs/conventions/`를 같은 PR에서 고친다
  ([ADR-0010 D4](../adr/0010-convention-docs-and-design-done-criteria.md)).
- 화면을 추가하거나 흐름을 바꾸는 변경 → `docs/e2e/`의 해당 흐름 파일을 같은 PR에서 고친다
  ([ADR-0006 D6](../adr/0006-command-interface-and-test-layers.md)).
- 사용자 대면 기능을 추가하거나 바꾸는 변경 → `docs/performance/reports/`의 영향 시나리오
  기록을 같은 PR에서 추가·갱신한다
  ([ADR-0018 D9](../adr/0018-lynx-performance-analysis-boundary.md)).
- 결정을 바꾸는 변경 → ADR을 고친다. 새 번호를 붙일지 제자리에서 고칠지는
  [ADR-0010 D10](../adr/0010-convention-docs-and-design-done-criteria.md)이 정한다.
- **ADR을 고치는 변경 → 그 ADR을 링크한 `docs/conventions/`·`docs/screens.md` 자리를
  같은 PR에서 전부 연다.** 링크만 갈아끼우는 것이 아니라 **본문이 아직 옛 결정을
  말하는지** 읽는다. 규약과 명세는 ADR의 재진술이라 원본이 바뀌면 함께 바뀐다
  ([ADR-0010 D4](../adr/0010-convention-docs-and-design-done-criteria.md)).
- **가정이 해소되는 변경 → 그 가정을 인용한 코드 주석을 같은 PR에서 걷는다.**
  `docs/adr/README.md`의 가정을 인용한 주석도 재진술이다
  ([ADR-0010 D4](../adr/0010-convention-docs-and-design-done-criteria.md)).
- 문서는 `[Frontend]` 이슈 외의 이슈를 링크·언급하지 않는다. 대신 사실을 적는다
  ([ADR-0010 D9](../adr/0010-convention-docs-and-design-done-criteria.md)).

## Node·pnpm·Lynx 버전을 올릴 때

아래를 통과한 뒤에만 커밋한다. 생략하지 않는다.

1. `pnpm install --frozen-lockfile`
2. `pnpm verify`
3. **자체 호스트 앱에서 앱이 실제로 뜨는 것까지 확인.** Explorer만으로는 통과가 아니다.

([ADR-0005 D4](../adr/0005-runtime-and-package-manager-versions.md))

## Explorer의 Lynx 런타임 버전

Explorer는 남의 빌드라 잠글 수 없다. **하한은 3.9다** — 그 미만이면 `var(--token)`이
조용히 무효가 되고, 에러도 테스트 실패도 없이 스타일만 안 먹는다.

첫 화면을 띄우기 전에 버전을 확인하고 아래에 적는다.

| 확인일 | Explorer 릴리스 | 받은 자산 | 시뮬레이터 |
|---|---|---|---|
| 2026-08-25 | **4.0.1** (`lynx-family/lynx`) | `LynxExplorer-arm64.app.tar.gz` | iOS 26.5 / iPhone 17 Pro |

설치는 명령으로 재현된다. **번들 로드만 수동**이다 — `lynx://` 딥링크는 앱을 열기만 하고
번들을 자동으로 불러오지 않는다(두 형식 모두 확인).

```sh
gh release download 4.0.1 --repo lynx-family/lynx \
  --pattern 'LynxExplorer-arm64.app.tar.gz'
mkdir -p LynxExplorer-arm64.app
tar -zxf LynxExplorer-arm64.app.tar.gz -C LynxExplorer-arm64.app/
xcrun simctl boot 'iPhone 17 Pro' && open -a Simulator
xcrun simctl install booted LynxExplorer-arm64.app
xcrun simctl launch booted com.lynx.LynxExplorer
pnpm dev   # 나온 URL을 Explorer의 Bundle URL 칸에 붙여넣고 Go
```

## 자체 호스트 앱

`apps/ios`가 판정 환경이다 (ADR-0012 D5). 개발 루프는 Explorer이고, 여기서는 **빌드
산출물 로드** · **영속 저장소** · **오디오 재생**을 확인한다 — 셋 다 Explorer에서는
확인할 수 없다.

**Explorer에서 확인할 수 없는 이유가 둘로 갈린다.**

| 무엇 | 왜 Explorer가 못 보나 | 그래서 |
|---|---|---|
| 빌드 산출물 로드 | Explorer는 dev 서버 번들을 받는다 | **Release** 호스트가 필요하다 |
| 영속 저장소 · **오디오 재생** | **Explorer에 네이티브 모듈이 없다** (ADR-0012 D3). 호스트가 등록한 모듈은 둘이다 — `StorageModule` · `AudioPlaybackModule` (`docs/adr/README.md` 호스트 모듈 표) | **호스트**가 필요하다. **Debug 호스트로도 된다** — 모듈과 오디오 자산은 두 구성에 똑같이 들어간다 |

> **오디오가 Explorer에서 안 나는 것은 고장이 아니다.** 모듈이 없을 때 조용히 재생하지
> 않는 것이 정상 동작이다 (ADR-0017 D3) — 던지지도, 페이지가 죽지도 않는다.
> **정상과 고장이 같아 보이는 자리**이므로, 소리는 호스트에 올려서만 판정한다
> (`docs/e2e/listening.md` A~I).
>
> **네이티브 파일이나 오디오 자산이 바뀌면 호스트를 재빌드해야 한다.** `pnpm bundle:host`
> 는 Lynx 번들만 갈아끼운다 — 네이티브 쪽은 따라오지 않는다. 자산은 `audio/` **폴더
> 참조**라 디렉터리에 넣고 빼는 것이 자동으로 따라오지만, **등록이 어긋나도 빌드는
> 성공하고 `pnpm verify`도 전부 green이다.** 그래서 자산이 늘거나 줄면 **빌드된 `.app`
> 안을 직접 센다.**
>
> ```sh
> find /tmp/dd/Build/Products/Debug-iphonesimulator/Host.app -name '*.m4a' | wc -l
> ```

성능 수집 경로 전체를 재현할 때는 macOS, Xcode 26.5, iOS 26.5 runtime, CocoaPods가 있는
환경에서 한 명령을 쓴다.

```sh
pnpm --filter @libitums/mobile performance:capture:smoke
pnpm --filter @libitums/mobile performance:capture:smoke -- --udid <Simulator-UDID>
```

첫 명령은 iPhone 17 Pro Simulator를 만들고 bundle·pod·Release build·install·capture·분석
뒤 삭제한다. 두 번째는 지정한 UDID만 사용하며 그 Simulator는 삭제하지 않는다. 둘 다
Rendering과 Memory 증거의 존재만 확인하고 수치 성능을 판정하지 않는다. 원시 캡처는
로그나 artifact로 올리지 않는다. 세부 수동 수집은
[`performance-analysis.md`](../performance-analysis.md)를 따른다
([ADR-0020 D3~D5](../adr/0020-performance-report-ci-automation.md)).

일반 Host build·install 절차는 다음과 같다.

```sh
pnpm bundle:host                                                  # build + 사본 복사
cd apps/ios && pod install                                        # 최초 1회
xcodebuild -workspace Host.xcworkspace -scheme Host \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/dd build
xcrun simctl install booted /tmp/dd/Build/Products/Debug-iphonesimulator/Host.app
xcrun simctl launch booted com.libitum.host
```

**번들을 어디서 읽나** — 빌드 구성이 가른다 (ADR-0012 D2).

| 구성 | 읽는 곳 | 언제 |
|---|---|---|
| Debug | dev 서버 (`http://localhost:3000/main.lynx.bundle`) | 호스트에서 화면을 만질 때. 네이티브 재빌드 없이 앱만 재시작하면 반영된다 |
| Release | 앱 번들 안의 `main.lynx.bundle` | 시연·판정. 사본을 읽으므로 **`pnpm bundle:host`를 거쳐야 한다** |

> **`cp`를 손으로 하지 않는다.** `dev`와 `build`가 **같은 `dist/main.lynx.bundle`에 쓴다.**
> `build` 뒤에 `dev`를 한 번이라도 돌리면 그 파일이 dev 번들(10배 크기)로 덮이고,
> 그 상태로 복사하면 **Release 호스트가 dev 번들을 싣는다.** 화면은 떠서 티가 나지 않는다.
> `pnpm bundle:host`가 build와 복사를 붙여둔 이유가 이것이다.

포트가 다르거나 다른 기기의 서버를 볼 때는 실행 인자로 덮어쓴다.

```sh
xcrun simctl launch booted com.libitum.host --bundle-url=http://localhost:3001/main.lynx.bundle
```

**영속성 확인** — 저장 → 완전 종료 → 재실행 → 읽기.

```sh
xcrun simctl terminate booted com.libitum.host
xcrun simctl launch booted com.libitum.host
```

값이 어디 있는지 보려면 (시뮬레이터를 지우지 않고 확인하는 방법):

```sh
C=$(xcrun simctl get_app_container booted com.libitum.host data)
plutil -p "$C/Library/Preferences/com.libitum.host.plist"
```

앱 자신의 데이터 컨테이너에 `libitum.` 접두사로 들어간다. **앱을 지우면 같이 사라진다.**

> **에러 경계가 한 번 잡히면 HMR로 복구되지 않는다.** 실패 화면이 그대로 남고, 코드를
> 고쳐도 화면이 바뀌지 않는다. **앱을 재시작하거나 화면의 재시도를 눌러야 한다.**
> 모르면 원인을 코드에서 찾게 되고, 코드는 이미 고쳐져 있어서 한참 헤맨다.
>
> **Xcode 정식 설치가 필요하다.** Command Line Tools만으로는 `simctl`이 없다.
> 설치 후 `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`와
> iOS 시뮬레이터 런타임 다운로드(Xcode → Settings → Components)가 각각 필요하다.

([ADR-0005 D3](../adr/0005-runtime-and-package-manager-versions.md),
[ADR-0014 D1](../adr/0014-design-system-consumption-verified.md),
[ADR-0017 D2·D3](../adr/0017-host-native-capabilities-and-audio.md))
