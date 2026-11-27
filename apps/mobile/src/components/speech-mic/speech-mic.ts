// 공용 마이크(말하기 퀴즈 · 롤플레이)의 순수 계산입니다 — 음량 → 막대 높이, 남은 시간 → 링(ADR-0201 D6 개정 ⟨화면⟩).

/** 마이크의 국면 — 대기(누르면 듣기) · 듣는 중(음량) · 확인 중(다 듣고 판정 기다림) · 꺼짐. */
export type SpeechMicState = "idle" | "listening" | "checking" | "disabled";

/** 한 번 듣는 최대 시간입니다. 지나면 화면이 스스로 멈춥니다(링이 다 줄어듦). */
export const SPEECH_MIC_MAX_MS = 8000;
/** 음량을 읽는 간격입니다. */
export const SPEECH_MIC_POLL_MS = 100;

/** 막대 일곱 개의 모양 — 가운데가 가장 높습니다. */
const BAR_SHAPE = [0.35, 0.6, 0.8, 1, 0.8, 0.6, 0.35] as const;
const BAR_MIN_PX = 6;
const BAR_MAX_PX = 40;
/** 움직임 줄이기에서 막대가 서는 고정 음량입니다. */
const STILL_METER = 0.5;

/** Android 인식 서비스의 dB 범위(대략 -2 ~ 10)를 0 ~ 1로 옮깁니다. */
const DB_FLOOR = -2;
const DB_SPAN = 12;
/** iOS PCM RMS는 말소리가 0.05 언저리라 제곱근을 키워 0 ~ 1에 펼칩니다. */
const RMS_GAIN = 3;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

/** 호스트 음량을 0 ~ 1 미터 값으로 — dB가 오면(Android) 그것으로, 아니면 RMS(iOS)로. */
export function speechMeterOf(level: number, levelDb: number | null): number {
  if (levelDb !== null) return clamp01((levelDb - DB_FLOOR) / DB_SPAN);
  return clamp01(Math.sqrt(Math.max(0, level)) * RMS_GAIN);
}

/** 막대 일곱 개의 높이(px)입니다. 움직임 줄이기면 음량과 상관없이 같은 높이입니다. */
export function speechMicBarHeights(meter: number, reduced: boolean): readonly number[] {
  const value = reduced ? STILL_METER : clamp01(meter);
  return BAR_SHAPE.map((shape) =>
    Math.round(BAR_MIN_PX + (BAR_MAX_PX - BAR_MIN_PX) * shape * value),
  );
}

/** 남은 시간 비율 0 ~ 1(1 = 막 시작). */
export function speechMicRemaining(elapsedMs: number, maxMs: number = SPEECH_MIC_MAX_MS): number {
  return maxMs <= 0 ? 0 : clamp01(1 - elapsedMs / maxMs);
}

const RING_SIZE = 112;
const RING_RADIUS = 53;
const RING_STROKE = 5;
const RING_LENGTH = Math.round(2 * Math.PI * RING_RADIUS);

/** 남은 시간 링의 SVG — 바탕 원 위에 남은 만큼의 호를 12시부터 그립니다. */
export function speechMicRingSvg(remaining: number, track: string, arc: string): string {
  const offset = Math.round(RING_LENGTH * (1 - clamp01(remaining)));
  const center = RING_SIZE / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">` +
    `<circle cx="${center}" cy="${center}" r="${RING_RADIUS}" fill="none" stroke="${track}" stroke-width="${RING_STROKE}"/>` +
    `<circle cx="${center}" cy="${center}" r="${RING_RADIUS}" fill="none" stroke="${arc}" stroke-width="${RING_STROKE}" stroke-linecap="round" stroke-dasharray="${RING_LENGTH}" stroke-dashoffset="${offset}" transform="rotate(-90 ${center} ${center})"/>` +
    `</svg>`
  );
}
