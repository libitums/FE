#!/bin/sh
set -eu
ANDROID_APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEST_CLASSES_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_CLASSES_DIR"' EXIT
javac -d "$TEST_CLASSES_DIR" \
  "$ANDROID_APP_DIR/app/src/main/java/com/libitum/host/WebAuthContract.java" \
  "$ANDROID_APP_DIR/test/WebAuthContractTest.java"
java -cp "$TEST_CLASSES_DIR" com.libitum.host.WebAuthContractTest
