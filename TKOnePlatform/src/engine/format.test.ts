import { describe, expect, it } from "vitest";
import { clamp, fmtMoney, splitFeatures, toNum } from "./format";

describe("toNum", () => {
  it("returns finite numbers unchanged", () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(0)).toBe(0);
  });
  it("falls back for non-finite numbers", () => {
    expect(toNum(Infinity)).toBe(0);
    expect(toNum(NaN, 5)).toBe(5);
  });
  it("parses numeric strings and strips commas", () => {
    expect(toNum("1,200,000")).toBe(1200000);
    expect(toNum("  3.5 ")).toBe(3.5);
  });
  it("falls back for empty / invalid strings", () => {
    expect(toNum("")).toBe(0);
    expect(toNum("abc", 9)).toBe(9);
    expect(toNum("   ", 1)).toBe(1);
  });
  it("falls back for non-string, non-number values", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined, 7)).toBe(7);
    expect(toNum({}, 2)).toBe(2);
  });
});

describe("fmtMoney", () => {
  it("groups thousands", () => {
    expect(fmtMoney(1500000)).toBe("1,500,000");
    expect(fmtMoney("8900000")).toBe("8,900,000");
  });
  it("handles empty input as 0", () => {
    expect(fmtMoney("")).toBe("0");
    expect(fmtMoney(undefined)).toBe("0");
  });
});

describe("clamp", () => {
  it("clamps below, above and within range", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe("splitFeatures", () => {
  it("splits on commas and full-width commas", () => {
    expect(splitFeatures("a, b，c")).toEqual(["a", "b", "c"]);
  });
  it("drops empty tokens and trims", () => {
    expect(splitFeatures(" a ,, b ")).toEqual(["a", "b"]);
  });
  it("returns [] for empty / nullish", () => {
    expect(splitFeatures("")).toEqual([]);
    expect(splitFeatures(null)).toEqual([]);
    expect(splitFeatures(undefined)).toEqual([]);
  });
});
