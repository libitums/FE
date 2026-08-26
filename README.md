# FE

소마 17기 서비스 프로토타입의 **사용자 대면 클라이언트**를 담는 저장소다.
ReactLynx 앱(`apps/mobile`)이 Lynx 번들을 만들고, 호스트 앱이 그 번들을 로드해 실행한다.
첫 단계 목표는 핵심 사용자 흐름을 처음부터 끝까지 시연할 수 있는 상태다 (ADR-0001).

## 첫 실행

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

### `NODE_AUTH_TOKEN`은 아직 필요 없다

`.npmrc`가 `@libitum` 스코프에 이 변수를 요구하지만, **그 패키지들이 아직 의존성에 없어서
토큰 없이도 설치가 성공한다.** `pnpm` 명령마다 나오는 다음 경고는 무시해도 된다.

```
WARN  Issue while reading ".npmrc". Failed to replace env in config: ${NODE_AUTH_TOKEN}
```

`@libitum/design-tokens`·`@libitum/icons`가 배포돼 의존에 들어가는 순간 이 경고는
**404 실패로 바뀐다.** 그때 GitHub PAT(`read:packages`)를 환경 변수로 넣는다 —
`.env` 파일에 적는 것으로는 안 된다. **pnpm은 `.env`를 읽지 않는다.**

## 문서

| 어디 | 무엇 |
|---|---|
| [docs/conventions/](docs/conventions/) | 무엇을 해야 하는가 — 코드 규약과 작업 흐름 |
| [docs/adr/](docs/adr/) | 왜 그렇게 정했는가 — 결정 기록. 코드보다 먼저 읽는 곳 |
| [docs/e2e/](docs/e2e/) | 수동으로 통과시킬 흐름 |
