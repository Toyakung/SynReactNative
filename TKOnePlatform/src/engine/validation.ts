/* Pure validation rules driving the friendly inline-error UX. */

import type { Candidate, Requirement } from "../types";
import { toNum } from "./format";

export type Errors = Record<string, string>;

/**
 * Validate the client requirement form. Returns a map of field -> message.
 * An empty map means the form is valid.
 */
export function validateRequirement(req: Requirement): Errors {
  const errors: Errors = {};
  const min = toNum(req.budgetMin, NaN);
  const max = toNum(req.budgetMax, NaN);

  if (req.budgetMin.trim() === "" || Number.isNaN(min) || min < 0) {
    errors.budgetMin = "กรอกงบต่ำสุดเป็นตัวเลขที่ไม่ติดลบ";
  }
  if (req.budgetMax.trim() === "" || Number.isNaN(max) || max < 0) {
    errors.budgetMax = "กรอกงบสูงสุดเป็นตัวเลขที่ไม่ติดลบ";
  }
  if (!errors.budgetMin && !errors.budgetMax && max < min) {
    errors.budgetMax = "งบสูงสุดต้องไม่น้อยกว่างบต่ำสุด";
  }
  if (req.yieldTarget.trim() !== "") {
    const y = toNum(req.yieldTarget, NaN);
    if (Number.isNaN(y) || y < 0 || y > 100) {
      errors.yieldTarget = "เป้าผลตอบแทนต้องอยู่ระหว่าง 0–100%";
    }
  }
  if (req.location.trim() === "") {
    errors.location = "ระบุทำเลที่ลูกค้าต้องการ";
  }
  return errors;
}

/** Validate a single candidate property entry. */
export function validateCandidate(c: Candidate): Errors {
  const errors: Errors = {};
  if (c.name.trim() === "") {
    errors.name = "ต้องมีชื่อทรัพย์";
  }
  if (c.price.trim() !== "") {
    const p = toNum(c.price, NaN);
    if (Number.isNaN(p) || p < 0) errors.price = "ราคาต้องเป็นตัวเลขที่ไม่ติดลบ";
  }
  if (c.yieldEst.trim() !== "") {
    const y = toNum(c.yieldEst, NaN);
    if (Number.isNaN(y) || y < 0 || y > 100) {
      errors.yieldEst = "Yield ต้องอยู่ระหว่าง 0–100%";
    }
  }
  if (c.sourceUrl.trim() !== "" && !/^https?:\/\/.+/i.test(c.sourceUrl.trim())) {
    errors.sourceUrl = "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://";
  }
  return errors;
}

export function isValid(errors: Errors): boolean {
  return Object.keys(errors).length === 0;
}
