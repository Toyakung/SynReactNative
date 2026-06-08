import { describe, expect, it } from "vitest";
import { isValid, validateCandidate, validateRequirement } from "./validation";
import { DEFAULT_REQ, blankCandidate } from "../constants";
import type { Candidate, Requirement } from "../types";

const req = (over: Partial<Requirement> = {}): Requirement => ({ ...DEFAULT_REQ, ...over });
const cand = (over: Partial<Candidate> = {}): Candidate => ({ ...blankCandidate(1), name: "X", ...over });

describe("validateRequirement", () => {
  it("passes for a sensible requirement", () => {
    expect(validateRequirement(req())).toEqual({});
  });
  it("flags missing / negative / non-numeric budgets", () => {
    expect(validateRequirement(req({ budgetMin: "" })).budgetMin).toBeDefined();
    expect(validateRequirement(req({ budgetMin: "-1" })).budgetMin).toBeDefined();
    expect(validateRequirement(req({ budgetMax: "abc" })).budgetMax).toBeDefined();
  });
  it("flags max < min", () => {
    expect(validateRequirement(req({ budgetMin: "9", budgetMax: "5" })).budgetMax).toBeDefined();
  });
  it("flags out-of-range yield but allows empty yield", () => {
    expect(validateRequirement(req({ yieldTarget: "" }))).toEqual({});
    expect(validateRequirement(req({ yieldTarget: "200" })).yieldTarget).toBeDefined();
    expect(validateRequirement(req({ yieldTarget: "x" })).yieldTarget).toBeDefined();
  });
  it("flags missing location", () => {
    expect(validateRequirement(req({ location: "  " })).location).toBeDefined();
  });
});

describe("validateCandidate", () => {
  it("passes for a named candidate", () => {
    expect(validateCandidate(cand())).toEqual({});
  });
  it("requires a name", () => {
    expect(validateCandidate(cand({ name: " " })).name).toBeDefined();
  });
  it("validates price / yield ranges only when present", () => {
    expect(validateCandidate(cand({ price: "-3" })).price).toBeDefined();
    expect(validateCandidate(cand({ yieldEst: "150" })).yieldEst).toBeDefined();
    expect(validateCandidate(cand({ price: "", yieldEst: "" }))).toEqual({});
  });
  it("validates source url shape only when present", () => {
    expect(validateCandidate(cand({ sourceUrl: "notaurl" })).sourceUrl).toBeDefined();
    expect(validateCandidate(cand({ sourceUrl: "https://ok.com/x" }))).toEqual({});
    expect(validateCandidate(cand({ sourceUrl: "" }))).toEqual({});
  });
});

describe("isValid", () => {
  it("is true only for an empty error map", () => {
    expect(isValid({})).toBe(true);
    expect(isValid({ a: "x" })).toBe(false);
  });
});
