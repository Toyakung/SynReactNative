/* ───────────────────────────────────────────────────────────────────────────
   Built-in scoring engine (deterministic fallback when the AI is unreachable).
   It ONLY analyzes staff-entered, verified candidates — it never invents data.
   Pure function: same input → same output. Fully unit-tested to 100%.
   ─────────────────────────────────────────────────────────────────────────── */

import type {
  AnalysisResult,
  Candidate,
  Grade,
  RankedItem,
  Requirement,
  RiskGrade,
  SourceTier,
} from "../types";
import { CONTACT } from "../constants";
import { clamp, fmtMoney, splitFeatures, toNum } from "./format";

const TIER_CONFIDENCE: Record<SourceTier, Grade> = { "1": "A", "2": "B", "3": "C" };
const CONFIDENCE_WEIGHT: Record<string, number> = { A: 100, B: 80, C: 60 };

function gradeFromScore(match: number): Grade {
  if (match >= 85) return "A";
  if (match >= 72) return "B";
  if (match >= 58) return "C";
  if (match >= 45) return "D";
  return "F";
}

function scorePrice(price: number, bMin: number, bMax: number): number {
  if (price >= bMin && price <= bMax) return 100;
  if (price < bMin) return 70;
  // price above the ceiling — penalise proportionally to the overshoot.
  // Only reachable when bMax is finite (an Infinity ceiling is never exceeded).
  const overshoot = (price - bMax) / bMax;
  return clamp(100 - overshoot * 120, 0, 100);
}

function scoreYield(yld: number, target: number): number {
  if (target) return clamp((yld / target) * 100, 0, 100);
  if (yld) return clamp(yld * 16, 0, 100);
  return 50;
}

function scoreLocation(reqLoc: string, candLoc: string): number {
  if (!reqLoc || !candLoc) return 60;
  return candLoc.includes(reqLoc) || reqLoc.includes(candLoc) ? 100 : 55;
}

function scoreSpecial(reqSpecial: string[], candFeatures: string): number {
  if (!reqSpecial.length) return 65;
  const features = splitFeatures(candFeatures);
  const matched = reqSpecial.filter((s) =>
    features.some((x) => x.includes(s) || s.includes(x)),
  ).length;
  return clamp(50 + (matched / reqSpecial.length) * 50, 0, 100);
}

function riskOf(price: number, bMax: number, yld: number, target: number): RiskGrade {
  if (Number.isFinite(bMax) && price > bMax * 1.1) return "High";
  if (yld && target && yld < target * 0.8) return "Med";
  return "Low";
}

function rankOne(req: Requirement, c: Candidate): RankedItem {
  const bMin = toNum(req.budgetMin, 0);
  const bMaxRaw = toNum(req.budgetMax, 0);
  const bMax = bMaxRaw > 0 ? bMaxRaw : Infinity;
  const target = toNum(req.yieldTarget, 0);

  const price = toNum(c.price, 0);
  const yld = toNum(c.yieldEst, 0);

  const priceScore = scorePrice(price, bMin, bMax);
  const yieldScore = scoreYield(yld, target);
  const locScore = scoreLocation(req.location, c.location);
  const spScore = scoreSpecial(req.special ?? [], c.features);

  const tierConf = TIER_CONFIDENCE[c.sourceTier] ?? "C";
  const confWeight = CONFIDENCE_WEIGHT[tierConf];

  const match = clamp(
    Math.round(
      priceScore * 0.3 +
        yieldScore * 0.25 +
        locScore * 0.2 +
        spScore * 0.15 +
        confWeight * 0.1,
    ),
    0,
    100,
  );

  const investGrade = gradeFromScore(match);
  const riskGrade = riskOf(price, bMax, yld, target);

  const pros: string[] = [];
  const cons: string[] = [];
  const risks: string[] = [];

  if (price >= bMin && price <= bMax) pros.push("ราคาอยู่ในกรอบงบประมาณ");
  else cons.push("ราคาอยู่นอกกรอบงบที่ตั้งไว้");

  if (target && yld >= target) pros.push(`ผลตอบแทน ${yld}% ถึงเป้า (${target}%)`);
  else if (target) cons.push(`ผลตอบแทน ${yld || "?"}% ต่ำกว่าเป้า ${target}%`);

  if (locScore === 100) pros.push("ทำเลตรงตามที่ลูกค้าต้องการ");
  if (tierConf === "C") risks.push("แหล่งข้อมูลความน่าเชื่อถือปานกลาง ควร re-verify ก่อนเสนอ");
  if (!c.sourceUrl) risks.push("ยังไม่มีลิงก์แหล่งที่มา — ต้องยืนยันสถานะ active");

  const negotiation =
    Number.isFinite(bMax) && price > bMax
      ? "ราคาเกินงบ มีช่องต่อรอง ลองเสนอใกล้เพดานงบลูกค้า"
      : "ต่อรองตามอายุประกาศและความเร่งของผู้ขาย";

  return {
    id: c.id,
    matchScore: match,
    investGrade,
    riskGrade,
    confidence: c.sourceUrl ? tierConf : "D",
    rationale: `ทรัพย์ "${c.name}" ทำเล${c.location || "-"} ราคา ${fmtMoney(
      price,
    )} บาท — match ${match}/100 จากความสอดคล้องด้านราคา ผลตอบแทน ทำเล และความต้องการพิเศษ`,
    pros,
    cons,
    risks,
    negotiation,
  };
}

export function localAnalyze(req: Requirement, cands: Candidate[]): AnalysisResult {
  const ranked = cands
    .map((c) => rankOne(req, c))
    // sort by score desc; tie-break by id asc for deterministic ordering.
    .sort((a, b) => b.matchScore - a.matchScore || a.id - b.id);

  const top = ranked[0];
  const topCand = top ? cands.find((c) => c.id === top.id) : undefined;
  const topName = topCand?.name || "-";
  const topLocation = topCand?.location || "";
  const customerName = req.customerName || "ลูกค้า";

  const customerMessage =
    `เรียน คุณ${customerName}\n\n` +
    `ทีม TK One ได้คัดเลือกทรัพย์ที่ตรงกับความต้องการของท่านแล้ว ${cands.length} รายการ ` +
    `โดยตัวเลือกที่เราแนะนำเป็นอันดับหนึ่งคือ "${topName}" ทำเล${topLocation} ` +
    `ซึ่งสอดคล้องกับงบประมาณและเป้าหมายผลตอบแทนของท่านมากที่สุด\n\n` +
    `เราได้จัดทำรายงานเปรียบเทียบฉบับสมบูรณ์ให้ท่านพิจารณา หากสนใจเข้าชมทรัพย์ ทีมงานพร้อมประสานงานให้ทันทีครับ\n\n` +
    `ด้วยความนับถือ\nTK One Asset Group · ${CONTACT.phoneDisplay}`;

  const ownerOutreach = ranked.slice(0, 3).map((r) => {
    const c = cands.find((x) => x.id === r.id);
    const action = req.intent === "rent" ? "เช่า" : "ขาย";
    return {
      id: r.id,
      message:
        `สวัสดีครับ ทาง TK One Asset Group มีลูกค้าสนใจทรัพย์ "${c?.name}" ` +
        `ทำเล${c?.location || ""} ราคา ${fmtMoney(c?.price)} บาท\n\n` +
        `รบกวนสอบถามว่าทรัพย์ยังว่างสำหรับ${action}อยู่หรือไม่ครับ และขอนัดเข้าชมทรัพย์ในเร็ววัน ขอบคุณครับ`,
    };
  });

  return {
    ranked,
    recommendationId: top?.id,
    recommendationReason: top
      ? `แนะนำ "${topName}" เป็นอันดับหนึ่ง ด้วยคะแนน match สูงสุด (${top.matchScore}/100) ` +
        `และความสมดุลด้านราคา-ผลตอบแทน-ความเสี่ยงที่ดีที่สุดในกลุ่ม`
      : "ยังไม่มีทรัพย์เพียงพอสำหรับการแนะนำ",
    customerMessage,
    ownerOutreach,
    _engine: "built-in",
  };
}
