# Learning Unit

`LearningUnit`은 학습 목록에서 한 단위를 나타내는 100px 원형 control이다. 디자인 계약은
`libitums/design-system`의 `components/learning-unit.md` revision `01d3a3c`을 따른다.

- `status`: `default | available | active | clear`
- `icon`: Available과 Active에서 쓰는 padding 아이콘 SVG 문자열
- `narrative`: 이야기 연결 배지를 표시하는 독립 옵션
- `focused`: ReactLynx host가 전달하는 키보드 focus-visible 상태
- `accessibilityLabel`: 제목과 학습 유형을 포함한 단위 이름

Default는 잠금 글리프를 표시하고 입력과 focus를 받지 않는다. Clear는 tick을 표시하며,
Active와 Clear의 상태는 각각 `accessibility-value`의 `현재 항목`, `완료됨`으로 전달한다.
Narrative 배지는 별도 control이 아니며 접근성 이름에 `이야기 연결`을 덧붙인다.

제목·진행 문구·연결선과 목록 위치 정보는 상위 학습 목록이 소유한다.
