# ChatBubble 계약

- 시각·상태 원본: `libitums/design-system/components/chat-bubble.md` revision
  `979e57fec7b38533129da65166109984d2f16686`
- 기반 결정: ADR-0025 D0–D6와 2026-09-15 ChatBubble 확장
- 상태: **고정**. 이 문서를 다시 고정하기 전에는 하류 구현이 공개 이름, 입력 union,
  기본값, test-id, story 이름 또는 package subpath를 바꾸지 않는다.
- measurement: 없음. 분석 이벤트, sink, payload를 추가하지 않는다.

## 범위와 불변식

`@libitums/ui-lynx`에 짧은 텍스트 발화를 표시하는 비인터랙티브 ReactLynx 컴포넌트
`ChatBubble`을 추가한다. 제품 화면과 기존 화면 소유 `MessageBubble`은 이번 범위에서 교체하지
않는다.

1. Bubble의 보이는 자손은 Message text 하나다. Speaker, Avatar, Timestamp, Delivery status,
   Action은 상위 Message item의 composition 책임이며 빈 slot도 만들지 않는다.
2. `direction`은 `incoming | outgoing`, `size`는 `s | m | l`, `delivery`는
   `default | sending | sent | read | failed`, `contentLanguage`는 `ui | learning`이다.
3. 기본 size는 `m`, 기본 delivery는 `default`, 기본 content language는 `ui`다. Incoming은
   타입에서 non-default delivery를 허용하지 않으며 runtime contract도 항상 Default로 정규화한다.
4. `message`와 `speaker`는 trim 결과가 비어 있으면 각각 `message must not be empty`,
   `speaker must not be empty`로 거부한다. 화면에는 원문 message를 보존하고 speaker를 그리지 않는다.
5. `learning` content는 비어 있지 않은 `languageTag`를 요구한다. ReactLynx 0.125의 공식 text
   props에는 `lang` 또는 대응 native language 속성이 없으므로 현재 구현은
   `data-language`와 `data-lang` metadata를 보존한다. native 발음 연결은 제품
   route 채택 시 host 검증과 함께 닫는다.
6. 최대 너비는 280px이고 콘텐츠 너비에 맞게 줄어든다. 높이·줄 수를 고정하거나 말줄임하지
   않는다. Lynx가 지원하는 `word-break: break-all`로 긴 URL·연속 문자열을 Bubble 안에서
   줄바꿈한다.
7. 일반 모서리는 `radius.md` 12px이다. Incoming의 논리적 end-start(왼쪽 아래), Outgoing의
   end-end(오른쪽 아래) 모서리만 0px이다. 정렬도 각각 `flex-start`, `flex-end`를 사용한다.
8. Incoming은 `gray.100`/`fg.neutral`, Outgoing은 `brand.strong`/`fg.neutral-inverted`를 쓴다.
   S/M/L은 design-system의 정확한 spacing과 `typography.body.s|m|l`을 사용한다.
9. root 하나를 `speaker: message` 접근성 이름과 text trait으로 노출하고 message 자손은 별도
   접근성 node가 되지 않게 한다. Outgoing의 non-default delivery는 한국어 상태 문구를
   `accessibility-value`로 연결한다. 이 상태 문구를 Bubble 안에 시각적으로 그리지는 않는다.
10. Bubble 전체에는 tap handler, button/link trait, focus API를 만들지 않는다. 링크나 재전송
    Action은 별도의 interactive element가 소유한다.

## 공개 TypeScript와 package 계약

```ts
type ChatBubbleDirection = "incoming" | "outgoing";
type ChatBubbleSize = "s" | "m" | "l";
type ChatBubbleDelivery = "default" | "sending" | "sent" | "read" | "failed";
type ChatBubbleContentLanguage = "ui" | "learning";

type IncomingChatBubbleProps = BaseProps & {
  direction: "incoming";
  delivery?: "default";
};

type OutgoingChatBubbleProps = BaseProps & {
  direction: "outgoing";
  delivery?: ChatBubbleDelivery;
};
```

`chat-bubble/`은 `ChatBubble.tsx`, `chat-bubble.contract.ts`, `chat-bubble.css`, PascalCase
unit/UI tests와 `index.ts`를 함께 소유한다. `@libitums/ui-lynx/chat-bubble`과
`@libitums/ui-lynx/chat-bubble/styles.css`를 독립 공개하고 root barrel과 aggregate CSS도 같은
구현을 재수출한다. pack은 type-erased ESM, declaration, CSS와 authored JSX를 검증한다.

## Storybook과 검증

Storybook은 Incoming, Outgoing, Small, Large, Failed, Learning Language, Long Content를
제공하고 `chat-bubble.web.bundle`이 public subpath를 소비한다. Controls는 JSON 직렬화 가능한
값만 넘기고 invalid 값은 runtime normalizer가 고정된 fallback으로 바꾼다.

- unit: 기본값, delivery 문구, 학습 languageTag 필수, 빈 message/speaker 거부, CSS token 계약
- UI: Message-only 시각 구조, 한 접근성 node, direction/size/delivery/language metadata, 무상호작용
- integration: root/subpath identity, export map, dist/tarball, authored JSX, Storybook bundle/story
- manual: 280px 상한, 세 크기, 논리 방향 모서리, 긴 문자열/큰 글자/RTL reflow
- native deferred: VoiceOver/TalkBack의 화자+본문 낭독, delivery value, 학습 언어 발음

## 범위 밖

- 상위 Message item, speaker/avatar/meta/action 컴포넌트
- 실시간 message announcement와 Message list 상태
- 제품 `MessengerScreen` 이관
- 링크 parsing·rendering, 이미지·음성·파일·카드 메시지
- 서버 전송 상태 machine, retry, persistence, analytics
