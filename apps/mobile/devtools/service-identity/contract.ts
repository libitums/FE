export interface ServiceIdentitySnapshot {
  readonly displayName: string | null;
  readonly applicationBundleIdentifiers: readonly string[];
  readonly testBundleIdentifiers: readonly string[];
  readonly packageNames: readonly string[];
  readonly cssVariablePrefixes: readonly string[];
  readonly storageKeyPrefixes: readonly string[];
  readonly performanceIdentifiers: readonly string[];
}

export type ServiceIdentityViolationCode =
  | "display-name-mismatch"
  | "application-bundle-id-mismatch"
  | "test-bundle-id-mismatch"
  | "package-scope-mismatch"
  | "css-prefix-mismatch"
  | "storage-prefix-mismatch"
  | "performance-identifier-mismatch";

export interface ServiceIdentityViolation {
  readonly code: ServiceIdentityViolationCode;
  readonly actual: string | null;
}

export function validateServiceIdentity(
  snapshot: ServiceIdentitySnapshot,
): readonly ServiceIdentityViolation[] {
  const violations: ServiceIdentityViolation[] = [];
  const first = (value: readonly string[] | null | undefined): string | null =>
    Array.isArray(value) && value.length > 0 ? value[0] : null;
  const containsExactly = (
    value: readonly string[] | null | undefined,
    expected: readonly string[],
  ): boolean =>
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((identifier) => expected.includes(identifier)) &&
    expected.every((identifier) => value.includes(identifier));

  if (snapshot.displayName !== "Duru") {
    violations.push({
      code: "display-name-mismatch",
      actual: snapshot.displayName ?? null,
    });
  }
  if (!containsExactly(snapshot.applicationBundleIdentifiers, ["com.libitum.host"])) {
    violations.push({
      code: "application-bundle-id-mismatch",
      actual: first(snapshot.applicationBundleIdentifiers),
    });
  }
  if (!containsExactly(snapshot.testBundleIdentifiers, ["com.libitum.host.tests"])) {
    violations.push({
      code: "test-bundle-id-mismatch",
      actual: first(snapshot.testBundleIdentifiers),
    });
  }
  if (
    !containsExactly(snapshot.packageNames, [
      "@libitums/mobile",
      "@libitums/design-tokens",
      "@libitums/icons",
    ])
  ) {
    violations.push({
      code: "package-scope-mismatch",
      actual: first(snapshot.packageNames),
    });
  }
  if (!containsExactly(snapshot.cssVariablePrefixes, ["--libitum-"])) {
    violations.push({
      code: "css-prefix-mismatch",
      actual: first(snapshot.cssVariablePrefixes),
    });
  }
  if (!containsExactly(snapshot.storageKeyPrefixes, ["libitum."])) {
    violations.push({
      code: "storage-prefix-mismatch",
      actual: first(snapshot.storageKeyPrefixes),
    });
  }
  if (
    !containsExactly(snapshot.performanceIdentifiers, [
      "libitum:navigation:",
      "com.libitum.performance-capture",
    ])
  ) {
    violations.push({
      code: "performance-identifier-mismatch",
      actual: first(snapshot.performanceIdentifiers),
    });
  }

  return violations;
}
