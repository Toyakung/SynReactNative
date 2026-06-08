import type { CSSProperties, ReactNode } from "react";
import { C, gradeColor } from "../theme";
import type { Grade as GradeType } from "../types";

export const card: CSSProperties = {
  background: C.paper,
  border: `1px solid ${C.line}`,
  borderRadius: 12,
};
export const lbl: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 4,
  display: "block",
};
export const inp: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: `1px solid ${C.line2}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  color: C.ink,
  background: "#fff",
  outline: "none",
};

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={lbl} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" style={{ color: C.red, fontSize: 11.5, marginTop: 3, display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function Grade({ g }: { g: GradeType }) {
  return (
    <span
      aria-label={`เกรด ${g}`}
      style={{
        display: "inline-block",
        width: 22,
        height: 22,
        lineHeight: "22px",
        textAlign: "center",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 12,
        color: "#fff",
        background: gradeColor[g] || C.muted,
        fontFamily: "monospace",
      }}
    >
      {g}
    </span>
  );
}

type BtnKind = "primary" | "gold" | "ghost" | "teal";

export function Btn({
  children,
  onClick,
  kind = "primary",
  disabled,
  small,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  small?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const styles: Record<BtnKind, CSSProperties> = {
    primary: { background: `linear-gradient(135deg,${C.navy2},${C.navy})`, color: "#fff", border: "none" },
    gold: { background: `linear-gradient(135deg,${C.goldSoft},${C.gold})`, color: "#1c1404", border: "none" },
    ghost: { background: "#fff", color: C.navy, border: `1px solid ${C.line2}` },
    teal: { background: C.teal, color: "#fff", border: "none" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles[kind],
        padding: small ? "7px 13px" : "11px 20px",
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: small ? 13 : 14,
        fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
