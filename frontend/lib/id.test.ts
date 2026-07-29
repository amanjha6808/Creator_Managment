import { test } from "node:test";
import assert from "node:assert/strict";
import { generateId } from "./id";

test("generateId falls back when crypto.randomUUID is unavailable", () => {
  const originalRandomUUID = globalThis.crypto?.randomUUID;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: undefined,
    configurable: true,
  });

  try {
    const id = generateId();
    assert.equal(typeof id, "string");
    assert.ok(id.length > 0);
    assert.match(id, /^[a-z0-9]+$/i);
  } finally {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: originalRandomUUID,
      configurable: true,
    });
  }
});
