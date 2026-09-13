
/**
 * Maps the real 12-stage `JobState` enum to display copy and progress —
 * every label/grouping here corresponds to an actual backend stage, none
 * are invented. Checklist groups collapse the granular stages into the
 * 6-step view from the design spec (Uploading / Extracting / Processing /
 * Chunking / Indexing / Ready) purely for display; the underlying source
 * of truth is still the raw `JobStateValue`.
 */

import { JOB_STATES, type JobStateValue } from "@/types";

export const JOB_STATE_LABELS: Record<JobStateValue, string> = {
  QUEUED: "Queued",
  VALIDATING: "Validating",
  PARSING: "Extracting content",
  OCR: "Running OCR",
  NORMALIZING: "Normalizing",
  ANALYZING: "Analyzing content",
  SELECTING_STRATEGY: "Selecting strategy",
  CHUNKING: "Chunking",
  ENRICHING: "Enriching",
  EMBEDDING: "Generating embeddings",
  WRITING_TO_VECTOR_STORE: "Indexing",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

/** Ordered, non-FAILED states only — used to compute a 0-100 progress percentage. */
const PROGRESS_SEQUENCE = JOB_STATES.filter((state) => state !== "FAILED");

export function jobProgressPercent(state: JobStateValue): number {
  if (state === "FAILED") return 0;
  const index = PROGRESS_SEQUENCE.indexOf(state);
  if (index === -1) return 0;
  return Math.round((index / (PROGRESS_SEQUENCE.length - 1)) * 100);
}

export type ChecklistStage = {
  label: string;
  states: JobStateValue[];
};

export const CHECKLIST_STAGES: ChecklistStage[] = [
  { label: "Uploading", states: ["QUEUED", "VALIDATING"] },
  { label: "Extracting content", states: ["PARSING", "OCR"] },
  { label: "Processing", states: ["NORMALIZING", "ANALYZING", "SELECTING_STRATEGY"] },
  { label: "Chunking", states: ["CHUNKING", "ENRICHING"] },
  { label: "Indexing", states: ["EMBEDDING", "WRITING_TO_VECTOR_STORE"] },
  { label: "Ready", states: ["COMPLETED"] },
];

export type ChecklistItemStatus = "done" | "current" | "pending";

export function checklistStatus(
  state: JobStateValue,
): Array<{ label: string; status: ChecklistItemStatus }> {
  if (state === "FAILED") {
    return CHECKLIST_STAGES.map((stage) => ({ label: stage.label, status: "pending" as const }));
  }

  const currentGroupIndex = CHECKLIST_STAGES.findIndex((stage) => stage.states.includes(state));

  return CHECKLIST_STAGES.map((stage, index) => ({
    label: stage.label,
    status:
      index < currentGroupIndex ? "done" : index === currentGroupIndex ? "current" : "pending",
  }));
}
