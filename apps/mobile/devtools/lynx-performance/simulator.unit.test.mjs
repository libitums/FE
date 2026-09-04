import { describe, expect, it } from "vitest";

import { CAPTURE_RELATIVE_PATH, captureFilePath, parseCaptureCommand } from "./simulator.mjs";

describe("Lynx simulator capture command", () => {
  it.each(["start", "path", "report", "stop"])("accepts the %s command", (command) => {
    expect(parseCaptureCommand([command])).toBe(command);
  });

  it("accepts pnpm's explicit argument separator", () => {
    expect(parseCaptureCommand(["--", "start"])).toBe("start");
  });

  it("rejects a missing, extra, or unknown command with usage", () => {
    expect(() => parseCaptureCommand([])).toThrow(/usage:.*start\|path\|report\|stop/i);
    expect(() => parseCaptureCommand(["start", "extra"])).toThrow(/usage/i);
    expect(() => parseCaptureCommand(["unknown"])).toThrow(/usage/i);
  });

  it("builds the capture path below the simulator app data container", () => {
    expect(captureFilePath("/simulator/data/container")).toBe(
      `/simulator/data/container/${CAPTURE_RELATIVE_PATH}`,
    );
  });
});
