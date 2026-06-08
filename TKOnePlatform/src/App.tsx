import { useMemo, useState } from "react";
import { C } from "./theme";
import { INTENT_LABELS, PTYPE_LABELS, SPECIAL_OPTS, STEPS } from "./constants";
import type { Intent, PropertyType } from "./types";
import { usePlatform } from "./hooks/usePlatform";
import { isValid, validateCandidate, validateRequirement } from "./engine/validation";
import { fmtMoney } from "./engine/format";
import { Btn, Field, Grade, card, inp, lbl } from "./components/atoms";
import { Report } from "./components/Report";

function copy(text: string): void {
  navigator.clipboard?.writeText(text);
}

export default function App() {
  const p = usePlatform();
  const {
    screen, setScreen, req, setR, toggleSpecial,
    cands, draft, setDraft, newDraft, editDraft, saveCand, removeCand,
    analysis, loading, doAnalyze, reportView, setReportView, editMsgs, setEditMsgs,
  } = p;

  const reqErrors = useMemo(() => validateRequirement(req), [req]);
  const draftErrors = useMemo(() => (draft ? validateCandidate(draft) : {}), [draft]);
  const [showReqErrors, setShowReqErrors] = useState(false);

  const candById = (id: number) => cands.find((c) => c.id === id);
  const ranked = analysis?.ranked ?? [];
  const recoCand = analysis?.recommendationId != null ? candById(analysis.recommendationId) ?? null : null;

  const goCandidates = () => {
    if (!isValid(reqErrors)) {
      setShowReqErrors(true);
      return;
    }
    setScreen("candidates");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Sans Thai',system-ui,sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box} input:focus,textarea:focus,select:focus{border-color:${C.navy2}!important}
        @media print{.no-print{display:none!important} body{background:#fff} .print-page{box-shadow:none!important;margin:0!important;width:auto!important}}`}</style>

      {/* Topbar */}
      <div className="no-print" style={{ background: C.navy, color: "#fff", padding: "12px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: `2px solid ${C.gold}` }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg,#1ad6c0,${C.goldSoft})` }} />
        <b style={{ letterSpacing: 0.5 }}>TK ONE</b>
        <span style={{ fontSize: 12, color: "#9fb0c8" }}>Internal Staff Platform · Property Intelligence</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#9fb0c8", fontFamily: "monospace" }}>เครื่องมือภายใน · v1</span>
      </div>

      {/* Stepper */}
      <nav aria-label="ขั้นตอน" className="no-print" style={{ display: "flex", gap: 6, padding: "14px 22px 0", flexWrap: "wrap", maxWidth: 1100, margin: "0 auto" }}>
        {STEPS.map(([k, t]) => {
          const on = screen === k;
          const done = STEPS.findIndex((s) => s[0] === screen) > STEPS.findIndex((s) => s[0] === k);
          return (
            <button
              key={k}
              aria-current={on ? "step" : undefined}
              onClick={() => setScreen(k as typeof screen)}
              style={{
                padding: "8px 14px",
                borderRadius: 9,
                border: `1px solid ${on ? C.navy : C.line2}`,
                background: on ? C.navy : done ? "#e6efe9" : "#fff",
                color: on ? "#fff" : done ? C.green : C.ink2,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {done ? "✓ " : ""}
              {t}
            </button>
          );
        })}
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 22px 70px" }}>
        {/* ── 1 INTAKE ── */}
        {screen === "intake" && (
          <form
            className="no-print"
            style={{ ...card, padding: 22 }}
            onSubmit={(e) => {
              e.preventDefault();
              goCandidates();
            }}
          >
            <h2 style={{ margin: "0 0 4px", fontFamily: "'Fraunces',serif", color: C.navy, fontSize: 22 }}>ความต้องการลูกค้า</h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 0 }}>พนักงานกรอกความต้องการจริงของลูกค้า เพื่อให้ AI ใช้เป็นเกณฑ์จับคู่และให้คะแนน</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginTop: 8 }}>
              <Field label="ชื่อลูกค้า" htmlFor="customerName">
                <input id="customerName" style={inp} value={req.customerName} onChange={(e) => setR("customerName", e.target.value)} placeholder="เช่น คุณสมชาย" />
              </Field>
              <Field label="ช่องทางติดต่อลูกค้า" htmlFor="customerContact">
                <input id="customerContact" style={inp} value={req.customerContact} onChange={(e) => setR("customerContact", e.target.value)} placeholder="โทร / LINE" />
              </Field>
              <Field label="วัตถุประสงค์" htmlFor="intent">
                <select id="intent" style={inp} value={req.intent} onChange={(e) => setR("intent", e.target.value as Intent)}>
                  {(Object.keys(INTENT_LABELS) as Intent[]).map((k) => (
                    <option key={k} value={k}>{INTENT_LABELS[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="ประเภททรัพย์" htmlFor="ptype">
                <select id="ptype" style={inp} value={req.ptype} onChange={(e) => setR("ptype", e.target.value as PropertyType)}>
                  {(Object.keys(PTYPE_LABELS) as PropertyType[]).map((k) => (
                    <option key={k} value={k}>{PTYPE_LABELS[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="งบต่ำสุด (บาท)" htmlFor="budgetMin" error={showReqErrors ? reqErrors.budgetMin : undefined}>
                <input id="budgetMin" style={inp} type="number" value={req.budgetMin} onChange={(e) => setR("budgetMin", e.target.value)} />
              </Field>
              <Field label="งบสูงสุด (บาท)" htmlFor="budgetMax" error={showReqErrors ? reqErrors.budgetMax : undefined}>
                <input id="budgetMax" style={inp} type="number" value={req.budgetMax} onChange={(e) => setR("budgetMax", e.target.value)} />
              </Field>
              <Field label="ทำเลที่ต้องการ" htmlFor="location" error={showReqErrors ? reqErrors.location : undefined}>
                <input id="location" style={inp} value={req.location} onChange={(e) => setR("location", e.target.value)} placeholder="เช่น อโศก, สุขุมวิท" />
              </Field>
              <Field label="เป้าผลตอบแทน Yield (%)" htmlFor="yieldTarget" error={showReqErrors ? reqErrors.yieldTarget : undefined}>
                <input id="yieldTarget" style={inp} type="number" value={req.yieldTarget} onChange={(e) => setR("yieldTarget", e.target.value)} />
              </Field>
              <Field label="ระยะลงทุน" htmlFor="horizon">
                <input id="horizon" style={inp} value={req.horizon} onChange={(e) => setR("horizon", e.target.value)} />
              </Field>
              <Field label="ระดับความเสี่ยง" htmlFor="risk">
                <select id="risk" style={inp} value={req.risk} onChange={(e) => setR("risk", e.target.value)}>
                  <option>ต่ำ</option>
                  <option>ปานกลาง</option>
                  <option>สูง</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={lbl}>ความต้องการพิเศษ</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SPECIAL_OPTS.map((s) => {
                  const on = req.special.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      aria-pressed={on}
                      onClick={() => toggleSpecial(s)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 20,
                        border: `1px solid ${on ? C.teal : C.line2}`,
                        background: on ? "#e7f3f0" : "#fff",
                        color: on ? C.teal : C.ink2,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {on ? "✓ " : ""}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="หมายเหตุเพิ่มเติม" htmlFor="notes">
                <textarea id="notes" style={{ ...inp, minHeight: 64, resize: "vertical" }} value={req.notes} onChange={(e) => setR("notes", e.target.value)} placeholder="บริบทอื่นๆ ของลูกค้า เช่น มีลูกเล็ก ต้องการ exit ใน 3 ปี ฯลฯ" />
              </Field>
            </div>
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <Btn type="submit">ถัดไป → เพิ่มทรัพย์ที่หามา</Btn>
            </div>
          </form>
        )}

        {/* ── 2 CANDIDATES ── */}
        {screen === "candidates" && (
          <div className="no-print">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Fraunces',serif", color: C.navy, fontSize: 22 }}>ทรัพย์ที่หามา</h2>
                <p style={{ color: C.muted, fontSize: 13, margin: "2px 0 0" }}>
                  พนักงานป้อนทรัพย์ที่ <b>ตรวจสอบแล้ว</b> — AI จะวิเคราะห์เฉพาะข้อมูลเหล่านี้ ไม่กุเพิ่มเอง
                </p>
              </div>
              <Btn kind="teal" onClick={newDraft}>+ เพิ่มทรัพย์</Btn>
            </div>

            {cands.length === 0 && (
              <div style={{ ...card, padding: 30, textAlign: "center", color: C.muted }}>ยังไม่มีทรัพย์ — กด “เพิ่มทรัพย์” เพื่อเริ่ม</div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {cands.map((c) => (
                <div key={c.id} style={{ ...card, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <b style={{ color: C.navy }}>{c.name || "(ไม่มีชื่อ)"}</b>
                      <span style={{ fontSize: 11, color: C.muted }}>· {c.location}</span>
                      {c.sourceUrl ? (
                        <span style={{ fontSize: 10.5, background: "#e7f3ec", color: C.green, padding: "2px 7px", borderRadius: 12 }}>มีลิงก์</span>
                      ) : (
                        <span style={{ fontSize: 10.5, background: "#fbe7e4", color: C.red, padding: "2px 7px", borderRadius: 12 }}>ยังไม่มีลิงก์</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: C.ink2, marginTop: 5, fontFamily: "monospace" }}>
                      {fmtMoney(c.price)} บาท · {c.sizeSqm || "?"} ตร.ม. · yield {c.yieldEst || "?"}% · Tier {c.sourceTier}
                    </div>
                    {c.features && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>จุดเด่น: {c.features}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Btn small kind="ghost" onClick={() => editDraft(c)}>แก้ไข</Btn>
                    <Btn small kind="ghost" onClick={() => removeCand(c.id)}>ลบ</Btn>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
              <Btn kind="ghost" onClick={() => setScreen("intake")}>← ย้อนกลับ</Btn>
              <Btn kind="gold" disabled={cands.length === 0} onClick={doAnalyze}>🤖 ให้ AI วิเคราะห์ ({cands.length} ทรัพย์)</Btn>
            </div>

            {draft && (
              <div
                role="dialog"
                aria-modal="true"
                style={{ position: "fixed", inset: 0, background: "#0009", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
                onClick={() => setDraft(null)}
              >
                <div style={{ ...card, padding: 20, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ margin: "0 0 12px", color: C.navy }}>{cands.find((c) => c.id === draft.id) ? "แก้ไขทรัพย์" : "เพิ่มทรัพย์"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="ชื่อทรัพย์ *" htmlFor="d-name" error={draftErrors.name}>
                      <input id="d-name" style={inp} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </Field>
                    <Field label="ทำเล" htmlFor="d-loc">
                      <input id="d-loc" style={inp} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                    </Field>
                    <Field label="ราคา (บาท)" htmlFor="d-price" error={draftErrors.price}>
                      <input id="d-price" style={inp} type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                    </Field>
                    <Field label="ขนาด (ตร.ม.)" htmlFor="d-size">
                      <input id="d-size" style={inp} type="number" value={draft.sizeSqm} onChange={(e) => setDraft({ ...draft, sizeSqm: e.target.value })} />
                    </Field>
                    <Field label="Yield ประเมิน (%)" htmlFor="d-yield" error={draftErrors.yieldEst}>
                      <input id="d-yield" style={inp} type="number" value={draft.yieldEst} onChange={(e) => setDraft({ ...draft, yieldEst: e.target.value })} />
                    </Field>
                    <Field label="Source Tier" htmlFor="d-tier">
                      <select id="d-tier" style={inp} value={draft.sourceTier} onChange={(e) => setDraft({ ...draft, sourceTier: e.target.value as typeof draft.sourceTier })}>
                        <option value="1">Tier 1 — ทางการ</option>
                        <option value="2">Tier 2 — พอร์ทัล</option>
                        <option value="3">Tier 3 — โซเชียล</option>
                      </select>
                    </Field>
                    <Field label="ลิงก์แหล่งที่มา (verified)" htmlFor="d-url" error={draftErrors.sourceUrl}>
                      <input id="d-url" style={inp} value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} placeholder="https://..." />
                    </Field>
                    <Field label="เบอร์เจ้าของ/เอเจนต์" htmlFor="d-owner">
                      <input id="d-owner" style={inp} value={draft.ownerContact} onChange={(e) => setDraft({ ...draft, ownerContact: e.target.value })} />
                    </Field>
                    <Field label="Agency" htmlFor="d-agency">
                      <input id="d-agency" style={inp} value={draft.agency} onChange={(e) => setDraft({ ...draft, agency: e.target.value })} />
                    </Field>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Field label="จุดเด่น (คั่นด้วยจุลภาค)" htmlFor="d-feat">
                      <input id="d-feat" style={inp} value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} placeholder="ติดรถไฟฟ้า, เฟอร์ครบ, Foreign Quota" />
                    </Field>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Field label="หมายเหตุ" htmlFor="d-notes">
                      <textarea id="d-notes" style={{ ...inp, minHeight: 50 }} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                    </Field>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <Btn kind="ghost" small onClick={() => setDraft(null)}>ยกเลิก</Btn>
                    <Btn small disabled={!isValid(draftErrors)} onClick={saveCand}>บันทึก</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3 ANALYSIS ── */}
        {screen === "analysis" && (
          <div className="no-print">
            <h2 style={{ margin: "0 0 4px", fontFamily: "'Fraunces',serif", color: C.navy, fontSize: 22 }}>ผลวิเคราะห์ของ AI</h2>
            {loading && (
              <div style={{ ...card, padding: 40, textAlign: "center", color: C.muted }}>
                <div style={{ fontSize: 30 }}>🤖</div>
                <p>AI กำลังวิเคราะห์และจัดอันดับทรัพย์...</p>
              </div>
            )}
            {!loading && analysis && (
              <>
                <p style={{ color: C.muted, fontSize: 12, marginTop: 0 }}>
                  เครื่องวิเคราะห์:{" "}
                  <b style={{ color: analysis._engine.includes("claude") ? C.green : C.amber }}>{analysis._engine}</b> · วิเคราะห์เฉพาะข้อมูลที่พนักงานป้อน
                </p>
                {recoCand && (
                  <div style={{ ...card, borderLeft: `4px solid ${C.teal}`, padding: 16, marginBottom: 14, background: "linear-gradient(180deg,#f4faf8,#fff)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.teal }}>AI แนะนำอันดับ 1</div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, color: C.navy, fontWeight: 600, margin: "3px 0 6px" }}>{recoCand.name}</div>
                    <p style={{ margin: 0, fontSize: 13.5, color: C.ink2 }}>{analysis.recommendationReason}</p>
                  </div>
                )}
                <div style={{ display: "grid", gap: 12 }}>
                  {ranked.map((r, i) => {
                    const c = candById(r.id);
                    if (!c) return null;
                    return (
                      <div key={r.id} style={{ ...card, padding: 16, borderColor: i === 0 ? C.teal : C.line }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div>
                            <span style={{ fontSize: 11, color: C.muted }}>อันดับ {i + 1}</span>
                            <div style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>
                              {c.name} <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· {c.location}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 700, color: i === 0 ? C.teal : C.navy }}>{r.matchScore}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>MATCH</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 14, margin: "8px 0", fontSize: 12, flexWrap: "wrap" }}>
                          <span>Invest: <Grade g={r.investGrade} /></span>
                          <span>Confidence: <Grade g={r.confidence} /></span>
                          <span style={{ color: C.muted }}>
                            Risk:{" "}
                            <b style={{ color: r.riskGrade === "Low" ? C.green : r.riskGrade === "High" ? C.red : C.amber }}>{r.riskGrade}</b>
                          </span>
                          <span style={{ color: C.muted, fontFamily: "monospace" }}>{fmtMoney(c.price)} บาท</span>
                        </div>
                        <p style={{ fontSize: 13, color: C.ink2, margin: "4px 0" }}>{r.rationale}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
                          {r.pros.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>จุดแข็ง</div>
                              {r.pros.map((x, j) => (
                                <div key={j} style={{ fontSize: 12, color: C.ink2 }}>▲ {x}</div>
                              ))}
                            </div>
                          )}
                          {r.cons.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>จุดอ่อน</div>
                              {r.cons.map((x, j) => (
                                <div key={j} style={{ fontSize: 12, color: C.ink2 }}>▼ {x}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        {r.risks.length > 0 && (
                          <div style={{ marginTop: 8, background: "#fdf6e8", borderRadius: 8, padding: "8px 11px" }}>
                            {r.risks.map((x, j) => (
                              <div key={j} style={{ fontSize: 12, color: C.amber }}>⚠ {x}</div>
                            ))}
                          </div>
                        )}
                        {r.negotiation && (
                          <div style={{ marginTop: 8, fontSize: 12, color: C.navy2 }}>
                            <b>ต่อรอง:</b> {r.negotiation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
                  <Btn kind="ghost" onClick={() => setScreen("candidates")}>← แก้ทรัพย์</Btn>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn kind="ghost" onClick={doAnalyze}>↻ วิเคราะห์ใหม่</Btn>
                    <Btn kind="gold" onClick={() => setScreen("reports")}>สร้างรายงาน PDF →</Btn>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 4 REPORTS ── */}
        {screen === "reports" && analysis && (
          <div>
            <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${C.line2}`, borderRadius: 10, padding: 3 }}>
                <button onClick={() => setReportView("client")} style={{ border: 0, background: reportView === "client" ? C.navy : "transparent", color: reportView === "client" ? "#fff" : C.ink2, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>👤 ลูกค้า</button>
                <button onClick={() => setReportView("internal")} style={{ border: 0, background: reportView === "internal" ? C.navy : "transparent", color: reportView === "internal" ? "#fff" : C.ink2, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>🔒 พนักงาน</button>
              </div>
              <Btn kind="gold" onClick={() => window.print()}>⬇︎ ดาวน์โหลด / พิมพ์ PDF</Btn>
              <span style={{ flex: 1 }} />
              <Btn kind="ghost" onClick={() => setScreen("outreach")}>ไปขั้นติดต่อ →</Btn>
            </div>
            <Report view={reportView} req={req} cands={cands} analysis={analysis} candById={candById} recoCand={recoCand} ranked={ranked} />
          </div>
        )}

        {/* ── 5 OUTREACH ── */}
        {screen === "outreach" && analysis && (
          <div className="no-print">
            <h2 style={{ margin: "0 0 4px", fontFamily: "'Fraunces',serif", color: C.navy, fontSize: 22 }}>ติดต่อลูกค้า &amp; เจ้าของทรัพย์</h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 0 }}>AI ร่างข้อความให้แล้ว — พนักงานตรวจ แก้ไข แล้วส่งผ่านช่องทางของตน (กดคัดลอก / โทร / LINE ได้เลย)</p>

            <div style={{ ...card, padding: 16, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>📨 ถึงลูกค้า {req.customerName && `· ${req.customerName}`}</div>
              <textarea aria-label="ข้อความถึงลูกค้า" style={{ ...inp, minHeight: 130, resize: "vertical" }} value={editMsgs.customer || ""} onChange={(e) => setEditMsgs((m) => ({ ...m, customer: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <Btn small kind="ghost" onClick={() => copy(editMsgs.customer || "")}>คัดลอกข้อความ</Btn>
                {req.customerContact && (
                  <Btn small kind="ghost" onClick={() => window.open(`tel:${req.customerContact.replace(/[^0-9+]/g, "")}`, "_self")}>📞 โทรลูกค้า</Btn>
                )}
              </div>
            </div>

            <div style={{ fontWeight: 700, color: C.navy, margin: "4px 0 8px" }}>🏠 ถึงเจ้าของทรัพย์ / เอเจนต์</div>
            <div style={{ display: "grid", gap: 12 }}>
              {(analysis.ownerOutreach || []).map((o) => {
                const c = candById(o.id);
                if (!c) return null;
                return (
                  <div key={o.id} style={{ ...card, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <b style={{ color: C.navy }}>
                        {c.name} <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· {c.agency || "—"} · {c.ownerContact || "ไม่มีเบอร์"}</span>
                      </b>
                    </div>
                    <textarea aria-label={`ข้อความถึงเจ้าของ ${c.name}`} style={{ ...inp, minHeight: 100, resize: "vertical" }} value={editMsgs[`o${o.id}`] || ""} onChange={(e) => setEditMsgs((m) => ({ ...m, [`o${o.id}`]: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <Btn small kind="ghost" onClick={() => copy(editMsgs[`o${o.id}`] || "")}>คัดลอก</Btn>
                      {c.ownerContact && (
                        <Btn small kind="ghost" onClick={() => window.open(`tel:${c.ownerContact.replace(/[^0-9+]/g, "")}`, "_self")}>📞 โทร</Btn>
                      )}
                      {c.sourceUrl && (
                        <Btn small kind="ghost" onClick={() => window.open(c.sourceUrl, "_blank")}>🔗 เปิดประกาศ</Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ ...card, padding: 14, marginTop: 16, background: "#eef3fb", borderColor: "#bcd0ec", fontSize: 12.5, color: "#1c3a5e" }}>
              ℹ️ <b>การส่งอัตโนมัติ</b> (ส่ง LINE/อีเมลถึงลูกค้าและเจ้าของทรัพย์โดยระบบเอง) ต้องต่อ messaging API + ระบบขอความยินยอม PDPA ในเวอร์ชัน backend จริง — ตอนนี้พนักงานส่งเองผ่านปุ่มด้านบน
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn kind="ghost" onClick={() => setScreen("reports")}>← กลับไปรายงาน</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
