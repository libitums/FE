// 표지 받기 표시의 라벨 · 고리 그림을 정하는 순수 모듈입니다(ADR-0165).

import { formatDownloadedSize } from "../download-settings/download-settings";
import type { CatalogMapCopy, CoverDownloadState } from "./catalog-map.contract";

/** 표지 라벨 — 받기 표시가 있으면 그 문구, 없으면 `null`(제목 「Intro」 그대로). */
export function coverDownloadLabelOf(
  state: CoverDownloadState,
  copy: CatalogMapCopy,
): string | null {
  if (state.kind === "getting-ready") return copy.coverDownload.gettingReady(state.percent);
  if (state.kind === "tap-to-download") {
    return copy.coverDownload.tapToDownload(
      state.bytes === null ? null : formatDownloadedSize(state.bytes),
    );
  }
  return null;
}

/** 진행 고리의 SVG 원문(지름 `size`) — 받는 중일 때만. 퍼센트는 0~100으로 자릅니다. */
export function coverProgressRingSvg(
  percent: number,
  colors: { readonly track: string; readonly arc: string },
  size: number = COVER_RING_SIZE,
): string {
  const ratio = Math.min(1, Math.max(0, percent / 100));
  const center = size / 2;
  const radius = center - RING_STROKE / 2;
  const stroke = `fill="none" stroke-width="${RING_STROKE}" stroke-linecap="round"`;
  const track = `<circle cx="${center}" cy="${center}" r="${radius}" ${stroke} stroke="${colors.track}"/>`;
  let arc = "";
  if (ratio >= 1) {
    arc = `<circle cx="${center}" cy="${center}" r="${radius}" ${stroke} stroke="${colors.arc}"/>`;
  } else if (ratio > 0) {
    // 12시에서 시계 방향으로 — 끝점은 각도에서 셉니다. 절반을 넘으면 큰 호 깃발을 1로 둡니다.
    const angle = ratio * 2 * Math.PI;
    const x = round(center + radius * Math.sin(angle));
    const y = round(center - radius * Math.cos(angle));
    const large = ratio > 0.5 ? 1 : 0;
    const d = `M ${center} ${center - radius} A ${radius} ${radius} 0 ${large} 1 ${x} ${y}`;
    arc = `<path d="${d}" ${stroke} stroke="${colors.arc}"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}">${track}${arc}</svg>`
  );
}

const RING_STROKE = 6;

const round = (value: number): number => Math.round(value * 100) / 100;

/** 고리 지름(px) — 표지 노드 상자(124)를 2px 바깥에서 두릅니다. 더 크면 아래 라벨에 겹칩니다. */
export const COVER_RING_SIZE = 128;
