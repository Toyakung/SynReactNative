import type { CSSProperties } from "react";
import { C } from "../theme";
import { CONTACT, INTENT_LABELS } from "../constants";
import { fmtMoney } from "../engine/format";
import type { AnalysisResult, Candidate, RankedItem, Requirement } from "../types";
import { Grade } from "./atoms";

interface ReportProps {
  view: "client" | "internal";
  req: Requirement;
  cands: Candidate[];
  analysis: AnalysisResult;
  candById: (id: number) => Candidate | undefined;
  recoCand: Candidate | null;
  ranked: RankedItem[];
}

export function Report({ view, req, cands, analysis, candById, recoCand, ranked }: ReportProps) {
  const top3 = ranked.slice(0, 3);
  const page: CSSProperties = {
    width: "210mm",
    minHeight: "292mm",
    background: "#fff",
    margin: "0 auto 18px",
    padding: "15mm",
    boxShadow: "0 8px 40px rgba(16,30,55,.14)",
    position: "relative",
    fontSize: 13,
  };
  const th: CSSProperties = {
    background: C.navy,
    color: "#eaf0f8",
    fontWeight: 600,
    fontSize: 11,
    padding: "8px 9px",
    textAlign: "left",
  };
  const td: CSSProperties = {
    padding: "8px 9px",
    borderBottom: `1px solid ${C.line}`,
    fontSize: 12.5,
    verticalAlign: "top",
  };
  const sec: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.gold,
    margin: "20px 0 8px",
  };

  const LH = ({ tag, tagColor, bg }: { tag: string; tagColor: string; bg: string }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: `2px solid ${C.navy}`,
        paddingBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,#1ad6c0,${C.goldSoft})` }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.navy }}>TK ONE ASSET GROUP</div>
          <div style={{ fontSize: 11, color: C.muted }}>ผู้นำด้านอสังหาฯ ยุคใหม่ · AI Property Matching</div>
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: C.muted }}>
        <div style={{ fontWeight: 700, color: C.navy, letterSpacing: 1 }}>PROPERTY INTELLIGENCE REPORT</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "3px 9px", borderRadius: 5, background: bg, color: tagColor }}>
          {tag}
        </span>
        <br />
        TKO-{new Date().getFullYear()}-{String(Date.now()).slice(-4)} · {new Date().toLocaleDateString("th-TH")}
      </div>
    </div>
  );

  const foot = (n: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        borderTop: `2px solid ${C.navy}`,
        marginTop: 16,
        paddingTop: 9,
        fontSize: 10.5,
        color: C.muted,
      }}
    >
      <span>
        <b style={{ color: C.navy }}>TK ONE ASSET GROUP</b> · AI Property Intelligence
      </span>
      <span>{n}</span>
    </div>
  );

  if (view === "client") {
    return (
      <div className="print-page" style={page}>
        <LH tag="CLIENT COPY" tagColor={C.teal} bg="#e7f0ee" />
        <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 24, color: C.navy, margin: "20px 0 2px" }}>
          รายงานคัดสรรทรัพย์เพื่อการตัดสินใจ
        </h1>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 6 }}>
          จัดทำสำหรับ {req.customerName ? `คุณ${req.customerName}` : "ลูกค้าผู้มีอุปการคุณ"} · วัตถุประสงค์:{" "}
          {INTENT_LABELS[req.intent]}
        </div>

        <div style={sec}>บทสรุปผู้บริหาร</div>
        <p style={{ color: C.ink2 }}>
          จากความต้องการของท่าน ทีม TK One ได้วิเคราะห์และจัดอันดับทรัพย์ {cands.length} รายการด้วยระบบ AI Matching
          เหลือตัวเลือกที่เหมาะสมที่สุดดังตารางด้านล่าง{" "}
          {recoCand && (
            <>
              โดยทรัพย์ที่เราแนะนำเป็นอันดับหนึ่งคือ <b>{recoCand.name}</b>
            </>
          )}
        </p>

        <div style={sec}>ความต้องการของลูกค้า</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {(
              [
                ["งบประมาณ", `${fmtMoney(req.budgetMin)} – ${fmtMoney(req.budgetMax)} บาท`],
                ["ทำเล", req.location],
                ["เป้าผลตอบแทน", `${req.yieldTarget || "-"}%`],
                ["ระยะลงทุน", req.horizon],
                ["ความเสี่ยงที่รับได้", req.risk],
                ["ความต้องการพิเศษ", (req.special || []).join(", ") || "-"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k}>
                <td style={{ ...td, color: C.muted, width: "38%" }}>{k}</td>
                <td style={{ ...td, fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={sec}>ตารางเปรียบเทียบ</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>ทรัพย์</th>
              <th style={th}>ทำเล</th>
              <th style={{ ...th, textAlign: "right" }}>ราคา</th>
              <th style={{ ...th, textAlign: "right" }}>Yield</th>
              <th style={th}>Match</th>
              <th style={th}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {top3.map((r, i) => {
              const c = candById(r.id);
              if (!c) return null;
              return (
                <tr key={r.id} style={i === 0 ? { background: "#eef7f3" } : {}}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                  <td style={td}>{c.location}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{fmtMoney(c.price)}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{c.yieldEst || "-"}%</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.matchScore}</td>
                  <td style={td}>
                    <Grade g={r.confidence} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {recoCand && (
          <>
            <div style={sec}>คำแนะนำหลัก</div>
            <div
              style={{
                border: `1px solid ${C.line2}`,
                borderLeft: `4px solid ${C.teal}`,
                borderRadius: 10,
                padding: "14px 16px",
                background: "linear-gradient(180deg,#f4faf8,#fff)",
              }}
            >
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, color: C.navy, fontWeight: 600 }}>
                {recoCand.name}
              </div>
              <p style={{ margin: "5px 0 0", color: C.ink2 }}>{analysis.recommendationReason}</p>
            </div>
          </>
        )}

        <div style={{ fontSize: 10.5, color: C.muted, borderTop: `1px solid ${C.line}`, marginTop: 16, paddingTop: 9, lineHeight: 1.6 }}>
          <b>ข้อจำกัดความรับผิด:</b> รายงานนี้จัดทำเพื่อประกอบการพิจารณาเบื้องต้น มิใช่คำแนะนำการลงทุนหรือการรับประกันผลตอบแทน
          ตัวเลขเป็นการประมาณการ ผู้ลงทุนควรตรวจสอบเอกสารสิทธิ์และขอคำปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจ
        </div>
        {foot(`ติดต่อทีมที่ปรึกษา: ${CONTACT.phoneDisplay}`)}
      </div>
    );
  }

  // INTERNAL
  return (
    <div className="print-page" style={page}>
      <LH tag="CONFIDENTIAL — INTERNAL" tagColor={C.red} bg="#fbe7e4" />
      <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 22, color: C.navy, margin: "18px 0 2px" }}>
        Internal Deal &amp; Verification Sheet
      </h1>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>สำหรับทีมขาย/ดีล เท่านั้น · ห้ามส่งให้ลูกค้า</div>
      <div style={{ background: "#fbe7e4", border: "1px solid #e9b8b1", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#6b211b", margin: "8px 0" }}>
        🔒 มีลิงก์ ผู้ติดต่อ และกลยุทธ์ต่อรอง — ใช้ภายในเท่านั้น
      </div>

      <div style={sec}>สถานะตรวจสอบ &amp; คะแนน</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ทรัพย์</th>
            <th style={th}>Match</th>
            <th style={th}>Invest</th>
            <th style={th}>Risk</th>
            <th style={th}>Confidence</th>
            <th style={th}>ลิงก์</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => {
            const c = candById(r.id);
            if (!c) return null;
            return (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.matchScore}</td>
                <td style={td}>
                  <Grade g={r.investGrade} />
                </td>
                <td style={td}>{r.riskGrade}</td>
                <td style={td}>
                  <Grade g={r.confidence} />
                </td>
                <td style={td}>
                  {c.sourceUrl ? (
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.navy2, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {c.sourceUrl}
                    </a>
                  ) : (
                    <span style={{ color: C.red, fontSize: 11 }}>ไม่มีลิงก์</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={sec}>ข้อมูลติดต่อ &amp; Negotiation</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ทรัพย์</th>
            <th style={th}>เบอร์</th>
            <th style={th}>Agency</th>
            <th style={th}>แนวต่อรอง (AI)</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => {
            const c = candById(r.id);
            if (!c) return null;
            return (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...td, fontFamily: "monospace" }}>{c.ownerContact || "-"}</td>
                <td style={td}>{c.agency || "-"}</td>
                <td style={{ ...td, fontSize: 11.5 }}>{r.negotiation || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={sec}>Internal Risk Notes</div>
      {ranked.map((r) => {
        const c = candById(r.id);
        if (!c || !r.risks?.length) return null;
        return (
          <div key={r.id} style={{ fontSize: 12, color: C.ink2, marginBottom: 4 }}>
            <b style={{ color: C.navy }}>{c.name}:</b> {r.risks.join(" · ")}
          </div>
        );
      })}

      <div style={{ background: "#eef3fb", border: "1px solid #bcd0ec", borderRadius: 8, padding: "9px 12px", fontSize: 11.5, color: "#1c3a5e", marginTop: 10 }}>
        ⚠ ยืนยันสถานะ active ของทุกทรัพย์ซ้ำในวันเสนอราคา (ห้ามใช้ข้อมูลเกิน 7 วัน) · re-verify ทรัพย์ confidence C/D ก่อนชูเสนอ
      </div>
      {foot(`Internal · TK One ${CONTACT.phoneDisplay} · LINE ${CONTACT.lineDisplay}`)}
    </div>
  );
}
