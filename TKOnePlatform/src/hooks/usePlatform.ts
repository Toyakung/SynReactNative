import { useCallback, useEffect, useState } from "react";
import type { AnalysisResult, Candidate, Requirement } from "../types";
import { DEFAULT_REQ, SAMPLE_CANDS, blankCandidate } from "../constants";
import { runAI } from "../ai/client";

export type Screen = "intake" | "candidates" | "analysis" | "reports" | "outreach";
export type ReportView = "client" | "internal";

const STORAGE_KEY = "tkone.session.v1";

interface Persisted {
  req: Requirement;
  cands: Candidate[];
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>;
      if (p.req && Array.isArray(p.cands)) {
        return { req: { ...DEFAULT_REQ, ...p.req }, cands: p.cands };
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { req: DEFAULT_REQ, cands: SAMPLE_CANDS };
}

export function usePlatform() {
  const initial = loadPersisted();
  const [screen, setScreen] = useState<Screen>("intake");
  const [req, setReq] = useState<Requirement>(initial.req);
  const [cands, setCands] = useState<Candidate[]>(initial.cands);
  const [draft, setDraft] = useState<Candidate | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportView, setReportView] = useState<ReportView>("client");
  const [editMsgs, setEditMsgs] = useState<Record<string, string>>({});

  // Persist requirement + candidates so a refresh never loses staff work.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ req, cands }));
    } catch {
      /* storage may be unavailable (private mode); non-fatal */
    }
  }, [req, cands]);

  const setR = useCallback(
    <K extends keyof Requirement>(k: K, v: Requirement[K]) =>
      setReq((p) => ({ ...p, [k]: v })),
    [],
  );

  const toggleSpecial = useCallback(
    (s: string) =>
      setReq((p) => ({
        ...p,
        special: p.special.includes(s)
          ? p.special.filter((x) => x !== s)
          : [...p.special, s],
      })),
    [],
  );

  const newDraft = useCallback(() => setDraft(blankCandidate()), []);
  const editDraft = useCallback((c: Candidate) => setDraft({ ...c }), []);

  const saveCand = useCallback(() => {
    setDraft((d) => {
      if (!d || !d.name.trim()) return d;
      setCands((p) => {
        const i = p.findIndex((c) => c.id === d.id);
        if (i >= 0) {
          const next = [...p];
          next[i] = d;
          return next;
        }
        return [...p, d];
      });
      return null;
    });
  }, []);

  const removeCand = useCallback(
    (id: number) => setCands((p) => p.filter((c) => c.id !== id)),
    [],
  );

  const doAnalyze = useCallback(async () => {
    setLoading(true);
    setScreen("analysis");
    const forceLocal = import.meta.env.VITE_STATIC_DEMO === "true";
    const r = await runAI(req, cands, { forceLocal });
    setAnalysis(r);
    setEditMsgs({
      customer: r.customerMessage,
      ...Object.fromEntries((r.ownerOutreach || []).map((o) => [`o${o.id}`, o.message])),
    });
    setLoading(false);
  }, [req, cands]);

  return {
    screen, setScreen,
    req, setR, toggleSpecial,
    cands, setCands,
    draft, setDraft, newDraft, editDraft, saveCand, removeCand,
    analysis, loading, doAnalyze,
    reportView, setReportView,
    editMsgs, setEditMsgs,
  };
}
