// 설정 › 다운로드의 순수 로직입니다(ADR-0095 D8).

/** 바이트를 `12.3 MB` 꼴로 씁니다. 1 MB 미만은 KB, 1 GB 이상은 GB. 음수 · 숫자 아님은 `0 KB`. */
export function formatDownloadedSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units: readonly [string, number][] = [
    ["GB", 1024 ** 3],
    ["MB", 1024 ** 2],
  ];
  for (const [unit, size] of units) {
    if (bytes >= size) return `${oneDecimal(bytes / size)} ${unit}`;
  }
  return `${oneDecimal(bytes / 1024)} KB`;
}

// 소수 한 자리 — 끝의 `.0`은 뗍니다(`45 MB`).
function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}
