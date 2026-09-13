"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export type MindMapEdgeData = {
  depth?: number;
};

export function MindMapEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps) {
  const depth = (data as MindMapEdgeData | undefined)?.depth ?? 1;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,

    // Controls how organic/curved the branch feels.
    curvature: depth === 1 ? 0.35 : 0.25,
  });

  const strokeWidth =
    depth === 1
      ? 2.5
      : depth === 2
        ? 1.8
        : 1.3;

  const opacity =
    depth === 1
      ? 0.75
      : depth === 2
        ? 0.55
        : 0.35;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "currentColor",
          strokeWidth,
          opacity,
          fill: "none",
        }}
        className="text-indigo-400 dark:text-indigo-400"
      />

      {/* Reserved for future edge interactions.
          We intentionally keep the edge visually clean for now. */}
      <EdgeLabelRenderer>
        <div className="pointer-events-none absolute" />
      </EdgeLabelRenderer>
    </>
  );
}