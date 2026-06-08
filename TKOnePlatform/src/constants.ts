import type { Candidate, Requirement } from "./types";

export const CONTACT = {
  phoneDisplay: "096-017-6446",
  phoneTel: "+66960176446",
  lineUrl: "https://lin.ee/kDSKhaD",
  lineDisplay: "@tkone",
} as const;

export const STEPS: ReadonlyArray<readonly [string, string]> = [
  ["intake", "1 · ความต้องการลูกค้า"],
  ["candidates", "2 · ทรัพย์ที่หามา"],
  ["analysis", "3 · AI วิเคราะห์"],
  ["reports", "4 · รายงาน PDF"],
  ["outreach", "5 · ติดต่อ"],
];

export const SPECIAL_OPTS = [
  "ติดรถไฟฟ้า",
  "สัตว์เลี้ยงได้",
  "ใกล้โรงเรียนนานาชาติ",
  "Foreign Quota",
  "เฟอร์ครบ",
  "ชั้นสูง/วิวดี",
  "ที่จอด 2+ คัน",
  "ใกล้โรงพยาบาล",
] as const;

export const INTENT_LABELS: Record<Requirement["intent"], string> = {
  buy: "ซื้อเพื่ออยู่",
  invest: "ลงทุน/ปล่อยเช่า",
  rent: "เช่า",
  sell: "ขาย",
};

export const PTYPE_LABELS: Record<Requirement["ptype"], string> = {
  condo: "คอนโด",
  house: "บ้านเดี่ยว",
  townhouse: "ทาวน์เฮาส์",
  office: "ออฟฟิศ",
  commercial: "อาคารพาณิชย์",
  land: "ที่ดิน",
};

export const SAMPLE_CANDS: Candidate[] = [
  {
    id: 1,
    name: "Luxury 1BR · Asok",
    location: "อโศก",
    price: "8900000",
    sizeSqm: "45",
    yieldEst: "5.5",
    sourceTier: "2",
    sourceUrl: "https://example.com/sample-A",
    ownerContact: "08X-XXX-XXXX",
    agency: "ตัวอย่างเอเจนซี A",
    features: "ติดรถไฟฟ้า, Foreign Quota, เฟอร์ครบ",
    notes: "ติด BTS อโศก + MRT สุขุมวิท",
  },
  {
    id: 2,
    name: "Luxury 2BR · Phrom Phong",
    location: "พร้อมพงษ์",
    price: "15200000",
    sizeSqm: "68",
    yieldEst: "4.8",
    sourceTier: "1",
    sourceUrl: "https://example.com/sample-B",
    ownerContact: "08X-XXX-XXXX",
    agency: "Direct Owner",
    features: "ชั้นสูง/วิวดี, เฟอร์ครบ, ที่จอด 2+ คัน",
    notes: "ห้องมุม วิวสวน",
  },
];

export const DEFAULT_REQ: Requirement = {
  intent: "buy",
  ptype: "condo",
  budgetMin: "8000000",
  budgetMax: "16000000",
  location: "อโศก",
  yieldTarget: "5",
  horizon: "3-5 ปี",
  risk: "ปานกลาง",
  special: ["ติดรถไฟฟ้า", "Foreign Quota"],
  notes: "",
  customerName: "",
  customerContact: "",
};

export function blankCandidate(id: number = Date.now()): Candidate {
  return {
    id,
    name: "",
    location: "",
    price: "",
    sizeSqm: "",
    yieldEst: "",
    sourceTier: "2",
    sourceUrl: "",
    ownerContact: "",
    agency: "",
    features: "",
    notes: "",
  };
}
