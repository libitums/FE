import { describe, expect, it } from "vitest";

import {
  validateServiceIdentity,
  type ServiceIdentitySnapshot,
} from "./contract";

const validSnapshot: ServiceIdentitySnapshot = {
  displayName: "Duru",
  applicationBundleIdentifiers: ["com.libitum.host"],
  testBundleIdentifiers: ["com.libitum.host.tests"],
  packageNames: ["@libitums/mobile", "@libitums/design-tokens", "@libitums/icons"],
  cssVariablePrefixes: ["--libitum-"],
  storageKeyPrefixes: ["libitum."],
  performanceIdentifiers: [
    "libitum:navigation:",
    "com.libitum.performance-capture",
  ],
};

describe("validateServiceIdentity", () => {
  it("accepts Duru while preserving every frozen technical identifier", () => {
    expect(validateServiceIdentity(validSnapshot)).toEqual([]);
  });

  it.each(["Host", "duru", "", null])(
    "reports display-name-mismatch for display name %j",
    (displayName) => {
      const violations = validateServiceIdentity({ ...validSnapshot, displayName });

      expect(violations).toContainEqual({
        code: "display-name-mismatch",
        actual: displayName,
      });
    },
  );

  it("reports an application bundle-id violation when com.libitum.host changes", () => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        applicationBundleIdentifiers: ["com.duru.host"],
      }),
    ).toContainEqual({
      code: "application-bundle-id-mismatch",
      actual: "com.duru.host",
    });
  });

  it("reports a test bundle-id violation when com.libitum.host.tests changes", () => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        testBundleIdentifiers: ["com.duru.host.tests"],
      }),
    ).toContainEqual({
      code: "test-bundle-id-mismatch",
      actual: "com.duru.host.tests",
    });
  });

  it("reports a package-scope violation when an @libitums package changes", () => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        packageNames: ["@duru/mobile"],
      }),
    ).toContainEqual({ code: "package-scope-mismatch", actual: "@duru/mobile" });
  });

  it("reports a css-prefix violation when --libitum- changes", () => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        cssVariablePrefixes: ["--duru-"],
      }),
    ).toContainEqual({ code: "css-prefix-mismatch", actual: "--duru-" });
  });

  it("reports a storage-prefix violation when libitum. changes", () => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        storageKeyPrefixes: ["duru."],
      }),
    ).toContainEqual({ code: "storage-prefix-mismatch", actual: "duru." });
  });

  it.each([
    "duru:navigation:",
    "com.duru.performance-capture",
  ])("reports a performance-identifier violation when %s changes", (actual) => {
    expect(
      validateServiceIdentity({
        ...validSnapshot,
        performanceIdentifiers: [actual],
      }),
    ).toContainEqual({ code: "performance-identifier-mismatch", actual });
  });

  it("reports every changed preserved family even when displayName is Duru", () => {
    const violations = validateServiceIdentity({
      ...validSnapshot,
      applicationBundleIdentifiers: ["com.duru.host"],
      packageNames: ["@duru/mobile"],
      cssVariablePrefixes: ["--duru-"],
      storageKeyPrefixes: ["duru."],
      performanceIdentifiers: ["duru:navigation:"],
    });

    expect(violations.map(({ code }) => code)).toEqual([
      "application-bundle-id-mismatch",
      "package-scope-mismatch",
      "css-prefix-mismatch",
      "storage-prefix-mismatch",
      "performance-identifier-mismatch",
    ]);
  });

  it("rejects canonical values mixed with replacement aliases in every preserved family", () => {
    const violations = validateServiceIdentity({
      ...validSnapshot,
      applicationBundleIdentifiers: ["com.libitum.host", "com.duru.host"],
      testBundleIdentifiers: ["com.libitum.host.tests", "com.duru.host.tests"],
      packageNames: ["@libitums/mobile", "@duru/mobile"],
      cssVariablePrefixes: ["--libitum-", "--duru-"],
      storageKeyPrefixes: ["libitum.", "duru."],
      performanceIdentifiers: [
        "libitum:navigation:",
        "duru:navigation:",
        "com.libitum.performance-capture",
        "com.duru.performance-capture",
      ],
    });

    expect(violations.map(({ code }) => code)).toEqual([
      "application-bundle-id-mismatch",
      "test-bundle-id-mismatch",
      "package-scope-mismatch",
      "css-prefix-mismatch",
      "storage-prefix-mismatch",
      "performance-identifier-mismatch",
    ]);
  });
});
