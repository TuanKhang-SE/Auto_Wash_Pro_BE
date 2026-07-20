import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBookingIsToday,
  getVietnamNowParts,
  isMinuteInsideShift,
} from "../src/services/staffOperationService.js";

test("getVietnamNowParts uses the Vietnam calendar day", () => {
  const result = getVietnamNowParts(new Date("2026-07-20T17:30:00.000Z"));

  assert.equal(result.date, "2026-07-21");
  assert.equal(result.minutes, 30);
});

test("assertBookingIsToday accepts only today's booking for Staff", () => {
  const now = new Date("2026-07-21T05:00:00.000Z");

  assert.doesNotThrow(() =>
    assertBookingIsToday("2026-07-21T00:00:00.000Z", "Staff", now)
  );
  assert.throws(
    () => assertBookingIsToday("2026-07-20T00:00:00.000Z", "Staff", now),
    /ngày hiện tại/
  );
  assert.throws(
    () => assertBookingIsToday("2026-07-22T00:00:00.000Z", "Staff", now),
    /ngày hiện tại/
  );
});

test("assertBookingIsToday keeps the Manager/Admin override", () => {
  const now = new Date("2026-07-21T05:00:00.000Z");

  assert.doesNotThrow(() =>
    assertBookingIsToday("2026-07-20T00:00:00.000Z", "Manager", now)
  );
  assert.doesNotThrow(() =>
    assertBookingIsToday("2026-07-22T00:00:00.000Z", "Admin", now)
  );
});

test("isMinuteInsideShift handles normal and overnight shifts", () => {
  assert.equal(isMinuteInsideShift(9 * 60, 8 * 60, 17 * 60), true);
  assert.equal(isMinuteInsideShift(18 * 60, 8 * 60, 17 * 60), false);
  assert.equal(isMinuteInsideShift(23 * 60, 22 * 60, 6 * 60), true);
  assert.equal(isMinuteInsideShift(5 * 60, 22 * 60, 6 * 60), true);
  assert.equal(isMinuteInsideShift(12 * 60, 22 * 60, 6 * 60), false);
});
