# 음성 벤더 비교 도구 (로컬)

유료 구독자용 **발음 피드백**(정해진 문장을 읽으면 낱말 · 음절 · 자모 점수)과 **서버 음성 인식**(기기 내장보다 나은 받아쓰기)의 벤더를, 문서가 아니라 **같은 녹음에 직접 돌린 결과**로 고르기 위한 도구입니다. 앱 코드가 아니며 서버에 올리지 않습니다. 의존성 없이 Node 내장 기능만 씁니다(오디오 변환에만 선택적으로 `ffmpeg`).

| 과제 | 벤더(실행 id) |
|---|---|
| 발음 평가 | Azure Speech `azure-pron` · SpeechSuper `speechsuper-pron` · 네이버 CLOVA Speech `clova-pron` |
| 받아쓰기(STT) | Azure `azure-stt` · ElevenLabs Scribe `elevenlabs-stt` · OpenAI `openai-stt` · Deepgram `deepgram-stt` · CLOVA `clova-stt` |

```sh
pnpm speech:bench <validate|convert|sample|estimate|run|report> [옵션]   # = node devtools/speech-bench/cli.mjs
pnpm test:speech-bench                                                 # 가짜 fetch로만 도는 테스트
```

## 먼저 읽을 주의

- **데이터는 이 컴퓨터에서만.** AI Hub 데이터는 한국 거주자 명의로 신청하며, 국외 반출에는 별도 합의가 필요합니다. **클라우드(원격 서버 · 클라우드 드라이브 · CI)에 올리지 말고 로컬에서만 돌립니다.** 녹음 · 매니페스트 · 결과는 저장소 밖 경로를 인자로 받고, 결과 경로가 저장소 안이면 도구가 멈춥니다(`.gitignore`에는 오디오 규칙이 없으므로 저장소에 두면 커밋될 수 있습니다).
- **벤더로 보내는 것 자체가 제3자 전송입니다.** 실행 전에 AI Hub 데이터 이용 조건(이용 목적 · 제3자 제공 · 국외 이전 허용 여부)을 먼저 확인하세요. 해외 벤더(Azure 리전 · ElevenLabs · OpenAI · Deepgram · SpeechSuper)로 보내는 것은 국외 이전이기도 합니다. 허용되지 않으면 그 벤더는 직접 녹음한(동의를 받은) 소규모 세트로만 돌립니다.
- **벤더 조건**(음성을 저장하지 않음 · 자기 모델 학습에 쓰지 않음 · 화자 식별 특징값을 만들지 않음)은 벤더마다 아래에서 확인합니다. 이 표는 「어디서 확인하는가」이지 확인 결과가 아닙니다 — 계약 전에 각 문서의 현재 문구와 DPA를 직접 읽으세요.

| 벤더 | 확인할 곳 | 이 도구가 요청에 넣는 것 |
|---|---|---|
| Azure Speech | Microsoft Learn 「Data, privacy, and security for Speech to text」, Microsoft Products and Services DPA | 없음(짧은 오디오 REST의 저장 여부는 문서 확인 필요) |
| SpeechSuper | 개인정보 처리방침 · 계약서(공개 문서가 적어 영업 문의로 서면 확인 필요) | 없음 |
| CLOVA Speech | 네이버 클라우드 플랫폼 이용약관 · CLOVA Speech 서비스 이용 안내 · 개인정보 처리방침 | 없음 |
| ElevenLabs | Terms · DPA · Speech to Text 문서의 `enable_logging`(무보관, 기업 계약만) | `ELEVENLABS_ZERO_RETENTION=1`이면 `enable_logging=false` |
| OpenAI | API 데이터 사용 정책(platform.openai.com 「Your data」) · 무보관(ZDR) 신청 | 없음 |
| Deepgram | 모델 개선 프로그램(MIP) 문서 · DPA | **요청마다 `mip_opt_out=true`** |

화자 식별 특징값(성문 · 임베딩)을 만들지 않는다는 조건은 어느 벤더도 API 문서에 따로 적혀 있지 않았습니다(2026-11-19 기준 확인 못 함) — 계약 단계에서 서면으로 물어야 합니다.

## 1. 데이터 신청

1. [AI Hub](https://www.aihub.or.kr)에서 「교육용 한국어 음성 데이터」(외국인 학습자의 한국어 발화, 전문가 점수 — 발음숙련도 · 유창성 · 이해가능도 각 1~5점, 전사, 화자의 모국어 · 숙련도)를 한국 거주자 명의로 신청합니다.
2. 받은 압축을 저장소 밖에 풉니다. 예: `~/data/aihub-ko-edu/{labels,audio}`.
3. 라벨 JSON 몇 개를 열어 칸 이름을 확인합니다. **이 도구는 아직 실제 라벨을 본 적이 없습니다.**

## 2. 변환 — 라벨 → 매니페스트

```sh
cp devtools/speech-bench/aihub-mapping.default.json ~/data/aihub-ko-edu/mapping.json   # 칸 이름을 실제 라벨에 맞게 고침
pnpm speech:bench convert --labels ~/data/aihub-ko-edu/labels --audio ~/data/aihub-ko-edu/audio \
  --mapping ~/data/aihub-ko-edu/mapping.json --out ~/data/speech-bench/all.jsonl
```

- 매핑의 칸마다 후보 경로를 여럿 적을 수 있습니다(점으로 잇고 배열 첨자는 숫자: `evaluation.0.score`). 기본 매핑은 **추정**이며 「받은 데이터로 확인 필요」입니다.
- 한 파일에 발화가 여럿이면 `records`에 그 배열의 경로를 적습니다. 채점자가 여럿이면(수 배열) 평균합니다.
- 유형 칸이 없으면 기준 문장이 있으면 낭독(`read`), 없으면 자유(`free`)로 추정하고 그 수를 알려 줍니다.
- 전사 표기 규칙(잡음 표시 · 이중 전사)은 `transcriptStrip` 정규식으로 지웁니다 — 데이터의 전사 규칙을 보고 채우세요.
- 검증에 걸린 라벨 · 오디오가 없는 라벨은 `<out>.problems.json`에 남고 매니페스트에는 들어가지 않습니다.

**매니페스트 형식**(JSONL, 한 줄에 발화 하나 — `manifest.mjs` 머리 주석이 정본):

```json
{"id":"S1_001","audio":"/abs/S1_001.wav","type":"read","referenceText":"사과를 먹어요","transcript":"사가를 머거요","human":{"pronunciation":3.5,"fluency":4,"comprehensibility":4},"speaker":{"id":"S1","l1":"vi","proficiency":"초급"},"durationSec":2.1}
```

직접 녹음한 세트도 이 형식으로 적으면 그대로 씁니다. `pnpm speech:bench validate --manifest …`로 검사합니다.

## 3. 표본

```sh
pnpm speech:bench sample --manifest ~/data/speech-bench/all.jsonl --n 300 --seed 1 \
  --by l1,proficiency,type --out ~/data/speech-bench/sample-300.jsonl
```

모국어 × 숙련도 × 유형의 층마다 되도록 같은 수를 뽑고, 작은 층이 모자라면 남는 몫을 다른 층에 나눕니다. 같은 시드면 언제 돌려도 같은 표본입니다. 상관계수 하나를 ±0.1 안팎으로 보려면 층마다 수십 개, 전체 수백 개가 필요합니다(크기는 아래 「결정할 것」).

## 4. 예상 비용

```sh
pnpm speech:bench estimate --manifest ~/data/speech-bench/sample-300.jsonl [--vendors azure-pron,openai-stt] [--via]
```

단가는 `prices.json`(고칠 수 있는 파일)에서 읽습니다. 계약 · 요금제마다 달라 **기본값은 전부 비어(null) 있고**, 비면 「미정」으로 나옵니다. 각 벤더 요금 페이지를 보고 `price`와 `note`(확인한 날짜)를 채우세요. 단위는 `hour` · `minute` · `request` · `per15s`(요청마다 15초 단위 올림). 길이가 없는 발화는 길이를 아는 발화의 평균으로 채우고 그 수를 보입니다. 다른 단가 파일은 `--prices`로 줍니다.

## 5. 실행

1. `env.example`을 저장소 밖에 복사해 키를 채웁니다(예: `~/.duru/speech-bench/keys.env`). 키가 없는 벤더는 건너뛰고 빠진 이름을 알려 줍니다.
2. `--yes` 없이 먼저 한 번 — 예상 비용과 ffmpeg 유무만 보이고 **호출하지 않습니다.**
3. 확인했으면 `--yes`를 붙입니다.

```sh
pnpm speech:bench run --manifest ~/data/speech-bench/sample-300.jsonl --out ~/data/speech-bench/run-1 \
  --env-file ~/.duru/speech-bench/keys.env --vendors azure-stt,openai-stt,azure-pron,speechsuper-pron \
  --via-stt azure-stt --concurrency 2 --interval-ms 250 --yes
```

- **순서**: STT 먼저, 그다음 발음 평가, 그다음 우회 평가(`--via-stt`).
- **정식 발음 평가**는 낭독(`read`) 발화만 보냅니다. 자유 발화에는 기준 문장이 없기 때문입니다.
- **자유 발화의 우회 평가**(`--via-stt <STT 실행 id>`): 그 STT가 받아 적은 글을 기준 문장 삼아 발음 평가를 다시 돌립니다(Azure 문서가 기준 문장 없는 발화에 권하는 방식). 결과는 `<발음벤더>__via__<STT벤더>.jsonl`. 낭독 발화에도 돌려 정식 점수와의 차이를 보고서에 냅니다.
- **오디오**: 16kHz mono 16bit WAV가 아니면 `ffmpeg`로 바꿔 `<out>/audio-cache/`에 둡니다. ffmpeg가 없으면 바꾸지 않고, WAV 16kHz만 받는 벤더(Azure · SpeechSuper)는 그 발화를 **건너뛰며 이유를 기록**합니다. 다른 벤더는 원본 형식 그대로 보냅니다.
- **길이 제한**: Azure 발음 평가 30초 · Azure STT 60초 · CLOVA 60초를 넘는 발화는 건너뜁니다.
- **속도 제한 · 재시도**: 벤더마다 시작 간격(`--interval-ms`)과 동시 실행 수(`--concurrency`), 429 · 5xx · 네트워크 오류만 지수 백오프로 재시도(`--max-attempts`, `Retry-After`를 따름).
- **이어 하기**: 결과는 발화마다 한 줄씩 바로 붙여 씁니다. 중단 뒤 같은 명령을 다시 돌리면 이미 한 발화(성공 · 건너뜀 · 실패)는 건너뜁니다. 실패와 건너뜀을 다시 하려면 `--retry-failed`. 중단으로 잘린 마지막 줄은 버리고 그 발화만 다시 합니다.

결과 한 줄(`<out>/results/<실행 id>.jsonl`): `id · ok · transcript · scores(문장) · words · syllables · jamo · latencyMs · attempts · referenceUsed · audioNote · raw(원본 응답)` — 실패는 `error · status`, 건너뜀은 `skipped · reason`.

## 6. 보고서 읽는 법

```sh
pnpm speech:bench report --manifest ~/data/speech-bench/sample-300.jsonl --out ~/data/speech-bench/run-1   # → run-1/report.md
```

1. **시험 세트** — 유형 · 모국어 · 숙련도별 수와 사람 점수 분포. 층이 너무 작으면 아래 묶음별 숫자를 믿지 마세요.
2. **공통** — 실패율(건너뜀 제외), 지연 p50 · p95(선형 보간), 발화당 비용(단가가 있을 때). 지연은 이 컴퓨터에서 잰 왕복 시간이라 앱 서버(도쿄 등)에서의 값과 다릅니다 — 벤더 사이의 비교로만 읽습니다.
3. **발음 평가** — 벤더 점수 칸(overall · accuracy · fluency …) × 사람 점수(발음 · 유창성 · 이해가능도)의 피어슨 r(95% 신뢰구간)과 스피어만 ρ, 그리고 모국어 · 숙련도 · 유형별 「overall ~ 사람 발음」, overall 분포. 점수 척도가 벤더마다 달라도 상관은 척도와 무관합니다. 신뢰구간이 겹치면 차이가 있다고 말하지 않습니다.
4. **우회 평가** — 낭독 발화에서 「STT 글을 기준 삼은 점수 − 정식 점수」의 평균 · 평균 절대값 · 상관. 우회 점수는 STT가 틀린 발음을 맞는 낱말로 받아 적으면 점수가 부풀므로 평균 차이가 양수로 크면 자유 발화 점수를 그만큼 덜 믿어야 합니다.
5. **STT** — 정답은 사람 전사(없으면 낭독의 기준 문장으로 대체하고 그 수를 보임). CER은 띄어쓰기를 뺀 음절 기준(주 지표)과 포함 기준, WER은 어절 기준 — 모두 말뭉치 단위(편집 합 ÷ 정답 길이 합). **「기준 문장 쪽으로 받아 적음」**은 사람 전사와 기준 문장이 다른(=학습자가 틀리게 읽은) 낭독 발화에서 벤더가 기준 문장과 똑같이(엄격) / 사람 전사보다 기준 문장에 더 가깝게(느슨) 받아 적은 비율입니다. 발음 피드백 · 따라 읽기에 쓸 STT는 이 값이 **낮아야** 합니다(내장 인식의 알려진 약점 — 틀린 발음을 맞게 고쳐 적어 학습자가 틀린 줄 모름).

## 7. 벤더를 고르는 기준

- **발음 평가**: (1) 사람 발음 점수와의 스피어만 ρ — 전체와 숙련도 · 모국어 묶음 모두에서 고르게 높은가(특정 모국어에서만 무너지면 실제 사용자층의 구성과 맞춰 봅니다) (2) 음절 · 자모 단위 점수가 실제로 오는가(화면에 「어느 글자가 틀렸는지」를 보이려면 필요) (3) 실패율 · p95 지연(앱에서 읽기 직후 결과를 보이려면 수 초 안) (4) 발화당 비용 × 예상 사용량 (5) 데이터 조건.
- **STT**: (1) CER(띄어쓰기 뺌) (2) 「기준 문장 쪽으로 받아 적음」이 낮은가 (3) 지연 · 실패율 · 비용 (4) 데이터 조건.
- **자유 발화**: 우회 평가의 평균 차이가 작고, 자유 발화에서 우회 점수와 사람 점수의 상관이 유지되는 조합(발음 벤더 × STT 벤더).
- 숫자는 표본 하나의 결과입니다. 결론을 내기 전에 시드를 바꾼 두 번째 표본에서 순위가 유지되는지 봅니다.

## 확인한 것과 못 한 것 (2026-11-19)

각 어댑터 머리 주석(`vendors.mjs`)에 자세히 적었습니다. 요약하면:

- 확인: Azure 짧은 오디오 REST(주소 · 헤더 · 발음 평가 파라미터 · 30/60초 · 응답 칸), CLOVA 단문 인식(한국어판: `assessment`는 Kor · Eng, 형식 · 60초 · 응답 칸), Deepgram(`Token` · `mip_opt_out`), ElevenLabs(`xi-api-key` · `enable_logging`), SpeechSuper HTTP 서명 · multipart(공식 예제 저장소).
- 미확인: SpeechSuper 한국어 coreType 이름과 음절 · 자모 응답 칸(문서 사이트를 자동으로 읽지 못함 — 여러 후보 칸을 읽게 해 둠), CLOVA `assessment_details`의 정확한 형식과 10MB 제한, Azure 한국어 음소 이름 유무, OpenAI 요청 모양(문서 접근 403 — 알려진 모양으로 구현), Deepgram nova-3의 한국어 지원, 모든 벤더의 단가.
