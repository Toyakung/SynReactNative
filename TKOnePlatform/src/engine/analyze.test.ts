import { describe, expect, it } from "vitest";
import { localAnalyze } from "./analyze";
import { blankCandidate } from "../constants";
import type { Candidate, Requirement } from "../types";

const baseReq: Requirement = {
  intent: "buy",
  ptype: "condo",
  budgetMin: "1000000",
  budgetMax: "2000000",
  location: "อโศก",
  yieldTarget: "5",
  horizon: "3 ปี",
  risk: "ปานกลาง",
  special: ["ติดรถไฟฟ้า"],
  notes: "",
  customerName: "",
  customerContact: "",
};

const c = (over: Partial<Candidate>): Candidate => ({ ...blankCandidate(over.id ?? 1), ...over });

describe("localAnalyze — grading bands", () => {
  const cands: Candidate[] = [
    // → A (perfect match)
    c({ id: 1, name: "A-perfect", price: "1500000", yieldEst: "6", location: "อโศก", features: "ติดรถไฟฟ้า", sourceTier: "1", sourceUrl: "https://x/1" }),
    // → B
    c({ id: 2, name: "B-good", price: "1500000", yieldEst: "4", location: "นนทบุรี", features: "ติดรถไฟฟ้า", sourceTier: "3", sourceUrl: "https://x/2" }),
    // → C
    c({ id: 3, name: "C-ok", price: "1500000", yieldEst: "2", location: "ชลบุรี", features: "สระว่ายน้ำ", sourceTier: "3", sourceUrl: "https://x/3" }),
    // → D (under budget)
    c({ id: 4, name: "D-weak", price: "500000", yieldEst: "2", location: "ภูเก็ต", features: "x", sourceTier: "3", sourceUrl: "https://x/4" }),
    // → F (way over budget, no link)
    c({ id: 5, name: "F-bad", price: "5000000", yieldEst: "1", location: "ระยอง", features: "", sourceTier: "3", sourceUrl: "" }),
  ];
  const out = localAnalyze(baseReq, cands);
  const byId = (id: number) => out.ranked.find((r) => r.id === id)!;

  it("produces a result for every candidate", () => {
    expect(out.ranked).toHaveLength(5);
  });
  it("assigns the full A–F spread", () => {
    expect(byId(1).investGrade).toBe("A");
    expect(byId(2).investGrade).toBe("B");
    expect(byId(3).investGrade).toBe("C");
    expect(byId(4).investGrade).toBe("D");
    expect(byId(5).investGrade).toBe("F");
  });
  it("ranks the perfect match first and recommends it", () => {
    expect(out.ranked[0].id).toBe(1);
    expect(out.recommendationId).toBe(1);
    expect(out.recommendationReason).toContain("A-perfect");
  });
  it("derives confidence from tier, and D when no source link", () => {
    expect(byId(1).confidence).toBe("A");
    expect(byId(5).confidence).toBe("D");
  });
  it("flags risk grades: High when far over budget, Med when yield short, Low otherwise", () => {
    expect(byId(5).riskGrade).toBe("High");
    expect(byId(4).riskGrade).toBe("Med");
    expect(byId(1).riskGrade).toBe("Low");
  });
  it("captures pros, cons and risks", () => {
    expect(byId(1).pros).toContain("ราคาอยู่ในกรอบงบประมาณ");
    expect(byId(1).pros).toContain("ทำเลตรงตามที่ลูกค้าต้องการ");
    expect(byId(5).cons).toContain("ราคาอยู่นอกกรอบงบที่ตั้งไว้");
    // tier-3 + missing link both raise risk notes
    expect(byId(5).risks.length).toBeGreaterThanOrEqual(2);
  });
  it("gives over-budget candidates a negotiation hint", () => {
    expect(byId(5).negotiation).toContain("เกินงบ");
    expect(byId(1).negotiation).toContain("ต่อรอง");
  });
  it("builds owner outreach only for the top 3", () => {
    expect(out.ownerOutreach).toHaveLength(3);
    expect(out.ownerOutreach[0].message).toContain("ขาย");
  });
});

describe("localAnalyze — edge requirements", () => {
  it("handles open budget, no yield target and empty special", () => {
    const req: Requirement = {
      ...baseReq,
      budgetMax: "",
      yieldTarget: "",
      special: [],
      customerName: "สมชาย",
    };
    const cands = [
      c({ id: 1, name: "no-loc", price: "1000000", yieldEst: "0", location: "" }),
      c({ id: 2, name: "high-yield", price: "1000000", yieldEst: "7", location: "อโศก" }),
    ];
    const out = localAnalyze(req, cands);
    expect(out.ranked).toHaveLength(2);
    expect(out.customerMessage).toContain("คุณสมชาย");
    // no link → both should have low confidence / risk notes
    expect(out.ranked.every((r) => r.risks.length > 0)).toBe(true);
  });

  it("uses the rent wording when intent is rent", () => {
    const out = localAnalyze({ ...baseReq, intent: "rent" }, [
      c({ id: 1, name: "R", price: "1500000", location: "อโศก", sourceUrl: "https://x" }),
    ]);
    expect(out.ownerOutreach[0].message).toContain("เช่า");
  });

  it("degrades gracefully with no candidates", () => {
    const out = localAnalyze(baseReq, []);
    expect(out.ranked).toEqual([]);
    expect(out.recommendationId).toBeUndefined();
    expect(out.recommendationReason).toContain("ยังไม่มีทรัพย์");
    expect(out.customerMessage).toContain("คุณลูกค้า");
    expect(out.ownerOutreach).toEqual([]);
  });

  it("breaks score ties deterministically by id", () => {
    const twin = (id: number) =>
      c({ id, name: `t${id}`, price: "1500000", yieldEst: "6", location: "อโศก", features: "ติดรถไฟฟ้า", sourceTier: "1", sourceUrl: "https://x" });
    const out = localAnalyze(baseReq, [twin(9), twin(3)]);
    expect(out.ranked[0].matchScore).toBe(out.ranked[1].matchScore);
    expect(out.ranked.map((r) => r.id)).toEqual([3, 9]);
  });

  it("survives malformed data from storage (defensive guards)", () => {
    // special missing entirely, and an out-of-domain source tier.
    const req = { ...baseReq, special: undefined } as unknown as Requirement;
    const broken = { ...blankCandidate(1), name: "Z", price: "1500000", location: "อโศก", sourceTier: "9", sourceUrl: "https://x" } as unknown as Candidate;
    const out = localAnalyze(req, [broken]);
    expect(out.ranked).toHaveLength(1);
    // unknown tier falls back to confidence "C"
    expect(out.ranked[0].confidence).toBe("C");
  });

  it("marks yield as meeting target in pros when it does", () => {
    const out = localAnalyze(baseReq, [
      c({ id: 1, name: "Y", price: "1500000", yieldEst: "6", location: "อโศก", sourceUrl: "https://x" }),
    ]);
    expect(out.ranked[0].pros.some((p) => p.includes("ถึงเป้า"))).toBe(true);
  });
});
