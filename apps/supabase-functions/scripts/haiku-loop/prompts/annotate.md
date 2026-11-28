# 대화 문제 지점 표시 (작성자 = 새 Opus 서브에이전트)

한국어 학습 앱 Duru의 캐릭터 대화 두 개(SONNET · HAIKU, 같은 학습자 페르소나)와, 앞서 채점자(Opus)가 매긴 점수 · 「가장 나빴던 답」 · 경계 문제 · 메모가 `{FILE}`에 있습니다.
턴마다 번호가 붙어 있습니다. 도구는 파일 읽기와 쓰기만 씁니다.

## 할 일
양쪽 대화에서 아쉬웠거나 문제가 있던 **캐릭터 답**을 턴 번호로 짚습니다(대화마다 3 ~ 8개, 중요한 것부터).
- 채점자가 점수를 깎은 근거(가장 나빴던 답 · 경계 문제 · 말투 깨짐 · 질문 둘 이상 · 낮은 축 점수의 이유)는 **반드시** 모두 해당 턴에 연결하고 `judged: true`.
- 채점자가 짚지 않았지만 분명한 문제(엉터리 퀴즈 · 같은 패턴 되풀이 · 지어낸 이름이나 사실 · 틀린 한국어 설명 · 학습자 말 무시 · 털어놓을 때 화제 돌리기 · 초급에게 어려운 말 · 메타 · 내부 문구 누출 등)는 `judged: false`.
- `axis`는 engagement · persona · level · responsive · variety · speech · multi_question · boundary · fact · leak 중 하나.
- `reason`은 한국어 한두 문장(무엇이 왜 문제인지, 어떻게 했어야 하는지).
- 같은 꼴이 여러 턴에 되풀이되면 대표 턴 하나에 적고 reason에 「4 · 7 · 11턴에도」처럼 다른 턴을 적습니다.
그리고 양쪽마다 `summary`(왜 이 점수였는지 한두 문장)를 씁니다.

## 결과
`{OUT}`에 JSON 하나:
```json
{"sonnet":{"summary":"…","flags":[{"turn":3,"quote":"문제 문장 일부","axis":"variety","severity":"mid","judged":true,"reason":"…"}]},"haiku":{"summary":"…","flags":[…]}}
```
`severity`는 high · mid · low. 다 쓰면 "완료"만 말합니다.
