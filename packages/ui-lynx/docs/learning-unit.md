# Learning Unit

`LearningUnit`은 학습 목록에서 한 단위를 나타내는 100px 원형 control이다. 디자인 계약은
`libitums/design-system`의 `components/learning-unit.md` revision `01d3a3c`을 따른다.

- `status`: `default | available | active | clear | checking`
- `icon`: Available과 Active에서 쓰는 padding 아이콘 SVG 문자열
- `narrative`: 이야기 연결 배지를 표시하는 독립 옵션
- `focused`: ReactLynx host가 전달하는 키보드 focus-visible 상태
- `accessibilityLabel`: 제목과 학습 유형을 포함한 단위 이름

Default는 잠금 글리프를 표시하고 입력과 focus를 받지 않는다. Clear는 tick을 표시한다.
상태는 접근성 이름 뒤 접미사로 전달한다 — Default `locked`, Active `current`, Clear `completed`
(Available은 접미사 없음, ADR-0016 D3 · D13). Narrative 배지는 별도 control이 아니며 접근성 이름에
`story`를 덧붙인다. 기본 문구는 영어이고 앱이 바꿔 넘길 prop은 없다(ADR-0031 D6).

Checking(2026-10-15, 디자인 계약 revision 밖의 앱 요구 — ADR-0062 D7)은 상위 목록이 상태를 아직 모르는 동안의
모양이다. 입력 · focus를 받지 않고(`bindtap`을 달지 않는다) traits는 `disabled`, 접미사는 `loading`
(`<이름>, loading[, story]`)이다. 면은 `gray-300`이고, 넘겨받은 `icon`은 면과 같은 색으로 칠해 자리만 잡는다 —
자물쇠 · tick은 모르는 상태를 주장하므로 쓰지 않는다. Narrative 배지와 링은 그대로 남는다. 눌림 축소 · reduced 막이 없다.
클래스 `ui-lynx-learning-unit-checking` · `data-status="checking"`. Storybook에 `Checking` 스토리가 있다.

제목·진행 문구·연결선과 목록 위치 정보는 상위 학습 목록이 소유한다.
