import assert from "node:assert/strict";
import test from "node:test";
import { formatPrice } from "../src/lib/format-price.ts";

test("UAH output is deterministic across browser/server ICU versions", () => {
  assert.equal(formatPrice(249900), "2\u00a0499\u00a0₴");
  assert.equal(formatPrice(0), "0\u00a0₴");
  assert.equal(formatPrice(1), "0,01\u00a0₴");
  assert.equal(formatPrice(149950), "1\u00a0499,50\u00a0₴");
  assert.equal(formatPrice(100000000), "1\u00a0000\u00a0000\u00a0₴");
});

test("prices only accept non-negative safe integer kopecks", () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => formatPrice(value), RangeError);
  }
});
