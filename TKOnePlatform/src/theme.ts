import type { Grade } from "./types";

export const C = {
  ink: "#11161f",
  ink2: "#39465c",
  muted: "#6b7894",
  line: "#e3e7ef",
  line2: "#cfd6e3",
  navy: "#0f2742",
  navy2: "#16344f",
  gold: "#9a7b32",
  goldSoft: "#c8a85a",
  teal: "#0f6e63",
  bg: "#eef1f6",
  paper: "#fff",
  red: "#a8332b",
  green: "#1f6b3a",
  amber: "#9a6a12",
} as const;

export const gradeColor: Record<Grade, string> = {
  A: "#1f6b3a",
  B: "#2f6b8f",
  C: "#9a6a12",
  D: "#a8332b",
  F: "#a8332b",
};
