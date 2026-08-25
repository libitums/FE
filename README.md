# FE

소마 17기 서비스 프로토타입의 **사용자 대면 클라이언트**를 담는 저장소다.
ReactLynx 앱(`apps/mobile`)이 Lynx 번들을 만들고, 호스트 앱이 그 번들을 로드해 실행한다.
첫 단계 목표는 핵심 사용자 흐름을 처음부터 끝까지 시연할 수 있는 상태다 (ADR-0001).

## 첫 실행

```sh
corepack enable                  # packageManager 고정이 작동하려면 필요하다 (ADR-0005 D3)
cp .env.example .env             # NODE_AUTH_TOKEN에 GitHub PAT(read:packages) (ADR-0011 D2)
export NODE_AUTH_TOKEN=...       # 없으면 @libitum/* 설치가 404로 죽는다
pnpm install
pnpm dev                         # dev 서버가 URL/QR을 낸다
```

Lynx Explorer로 그 URL을 연다 — 기기는 QR 스캔, 시뮬레이터는 번들 URL을 Enter Card URL에
붙여넣는다. Explorer는 [lynx-family GitHub releases](https://github.com/lynx-family/lynx/releases)에서 받는다.

> **판정 환경은 Explorer가 아니라 자체 호스트 앱(`apps/ios`)이다** (ADR-0012 D5).
> 호스트에서 판정하려면 Mac과 Xcode가 필요하다.
> 호스트는 **아직 만들지 않았다** — 별도 작업이다. 그전까지는 Explorer로 개발 루프만 돈다.

## 문서

| 어디 | 무엇 |
|---|---|
| [docs/conventions/](docs/conventions/) | 무엇을 해야 하는가 — 코드 규약과 작업 흐름 |
| [docs/adr/](docs/adr/) | 왜 그렇게 정했는가 — 결정 기록. 코드보다 먼저 읽는 곳 |
| [docs/e2e/](docs/e2e/) | 수동으로 통과시킬 흐름 |
