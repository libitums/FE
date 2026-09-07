#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { checkRepository } from "./check.mjs";
import { evaluatePerformanceReportPolicy } from "./policy.mjs";
import { mergeChangeSets, parsePorcelain, resolveGateMode } from "./gate-inputs.mjs";

/**
 * 범위를 산출해 `evaluatePerformanceReportPolicy`에 넘기고 결과를 찍는다.
 * @param {{ cwd?: string, env?: Record<string, string|undefined> }} [options]
 */
export function runGate({ cwd = process.cwd(), env = process.env } = {}) {
  throw new Error("not implemented: runGate");
}

function main() {
  try {
    const result = runGate({ cwd: process.cwd(), env: process.env });
    const output = result.ok ? console.log : console.error;
    output(result.message);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`성능 보고서 정책 게이트 실행 실패: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
