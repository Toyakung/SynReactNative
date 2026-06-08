/* Shared domain types for the TK ONE platform. */

export type Intent = "buy" | "invest" | "rent" | "sell";
export type PropertyType =
  | "condo"
  | "house"
  | "townhouse"
  | "office"
  | "commercial"
  | "land";
export type SourceTier = "1" | "2" | "3";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type RiskGrade = "Low" | "Med" | "High";

export interface Requirement {
  intent: Intent;
  ptype: PropertyType;
  budgetMin: string;
  budgetMax: string;
  location: string;
  yieldTarget: string;
  horizon: string;
  risk: string;
  special: string[];
  notes: string;
  customerName: string;
  customerContact: string;
}

export interface Candidate {
  id: number;
  name: string;
  location: string;
  price: string;
  sizeSqm: string;
  yieldEst: string;
  sourceTier: SourceTier;
  sourceUrl: string;
  ownerContact: string;
  agency: string;
  features: string;
  notes: string;
}

export interface RankedItem {
  id: number;
  matchScore: number;
  investGrade: Grade;
  riskGrade: RiskGrade;
  confidence: Grade;
  rationale: string;
  pros: string[];
  cons: string[];
  risks: string[];
  negotiation: string;
}

export interface OwnerOutreach {
  id: number;
  message: string;
}

export interface AnalysisResult {
  ranked: RankedItem[];
  recommendationId?: number;
  recommendationReason: string;
  customerMessage: string;
  ownerOutreach: OwnerOutreach[];
  /** Which engine produced this result (for transparency in the UI). */
  _engine: string;
}
