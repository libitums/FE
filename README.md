# FE

소마 17기 서비스 프로토타입의 **사용자 대면 클라이언트**를 담는 저장소다 (ADR-0001 D1).
클라이언트가 여럿일 수 있고, 앱마다 언어와 도구가 다르다.

## 앱

| 앱 | 무엇 | 도구 |
|---|---|---|
| [`apps/mobile`](apps/mobile) | 사용자 대면 화면 전부. Lynx 번들을 만든다 | ReactLynx · rspeedy · pnpm |
| [`apps/ios`](apps/ios) | 그 번들을 로드해 실행하는 네이티브 호스트 | Swift · Xcode · CocoaPods |

**번들을 만드는 쪽과 로드하는 쪽이 다르다** (ADR-0002 D3). 화면을 고치면 `apps/mobile`을
빌드해 `apps/ios`로 옮겨야 실기기에 반영된다 — `pnpm bundle:host`가 Lynx 번들과
번들이 참조하는 `Resource/static/` 자산을 함께 복사해 그 둘을 잇는다.

앱 이름은 서비스명이 아니라 **타깃**으로 짓는다 (ADR-0002 D4). 앱이 늘 때 무슨 축으로
나뉘는지가 이름에서 읽혀야 하기 때문이다. 웹 앱과 관리자 앱은 요구사항에 없어서 첫
단계에서 뺐고, 생기면 같은 규칙으로 들어온다.

첫 단계 목표는 핵심 사용자 흐름을 처음부터 끝까지 시연할 수 있는 상태다 (ADR-0001 D1).

## 첫 실행 — `apps/mobile`

아래는 Lynx 앱 쪽 절차다. `apps/ios`는 Xcode로 여는 별개 툴체인이고, 그 절차는 이 절
끝의 각주가 가리킨다.

```sh
nvm install && nvm use           # .nvmrc의 Node로 맞춘다. 없으면 install이 받아온다
corepack enable                  # packageManager 고정이 작동하려면 필요하다 (ADR-0005 D3)
pnpm install
pnpm dev                         # dev 서버가 URL을 낸다
```

**Node를 먼저 맞춰야 한다.** 범위 밖이면 `pnpm install`이 `ERR_PNPM_UNSUPPORTED_ENGINE`으로
막힌다 — 경고가 아니라 중단이다 (ADR-0005 D3의 `engineStrict`).
`nvm`이 없으면 [nvm 설치](https://github.com/nvm-sh/nvm#installing-and-updating)가 선행이다.

`pnpm dev`가 **실제로 출력한 URL**을 쓴다. 3000번이 점유돼 있으면 조용히 다음 포트로
옮겨가므로, 문서에 적힌 포트가 아니라 화면에 나온 것을 봐야 한다.

Lynx Explorer로 그 URL을 연다 — 기기는 QR 스캔, 시뮬레이터는 번들 URL을 Enter Card URL에
붙여넣는다. Explorer는 [lynx-family GitHub releases](https://github.com/lynx-family/lynx/releases)에서 받는다.

> **판정 환경은 Explorer가 아니라 자체 호스트 앱(`apps/ios`)이다** (ADR-0012 D5).
> 호스트는 만들어져 있다. 빌드·실행 절차는
> [docs/conventions/workflow.md](docs/conventions/workflow.md)에 있고, **Mac과 Xcode
> 정식 설치가 필요하다** — Command Line Tools만으로는 `simctl`이 없다.

### GitHub Packages 인증이 필요하다

`@libitums/design-tokens`·`@libitums/icons`가 의존에 있으므로 **토큰 없이는
`pnpm install`이 `401`로 죽는다.** GitHub PAT(scope: `read:packages`)를
`~/.npmrc`에 넣는다.

```ini
# ~/.npmrc  (저장소가 아니라 홈 디렉터리다)
//npm.pkg.github.com/:_authToken=<PAT>
```

**저장소 `.npmrc`에 넣으면 동작하지 않는다.** pnpm v10.34.2·v11.5.3부터 저장소가 소유한
`.npmrc`의 인증 항목을 무시한다(` WARN  Ignored project-level auth setting`). 저장소
`.npmrc`에는 registry 연결 한 줄만 커밋한다. **`.env`에 적는 것으로도 안 된다 — pnpm은
`.env`를 읽지 않는다.**

자세한 것은 [ADR-0014 D3](docs/adr/0014-design-system-consumption-verified.md)에 있다.

## 문서

| 어디 | 무엇 |
|---|---|
| [docs/screens.md](docs/screens.md) | 무엇이 있는가 — 화면 목록과 그 사이의 의존성 |
| [docs/conventions/](docs/conventions/) | 무엇을 해야 하는가 — 코드 규약과 작업 흐름 |
| [docs/adr/](docs/adr/) | 왜 그렇게 정했는가 — 결정 기록. 코드보다 먼저 읽는 곳 |
| [docs/e2e/](docs/e2e/) | 수동으로 통과시킬 흐름 |
