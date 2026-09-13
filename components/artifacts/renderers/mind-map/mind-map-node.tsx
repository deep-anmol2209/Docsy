"use client";

import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import {
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";

export type MindMapNodeData = {
  label: string;
  depth?: number;
  hasChildren?: boolean;
};

function getNodeStyles(depth: number) {
  if (depth === 0) {
    return {
      container:
        "min-w-[190px] max-w-[240px] rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 px-5 py-3.5 text-white shadow-xl shadow-indigo-500/25",
      icon:
        "bg-white/15 text-white",
      text:
        "text-sm font-bold tracking-tight text-white",
    };
  }

  if (depth === 1) {
    return {
      container:
        "min-w-[140px] max-w-[190px] rounded-xl border border-indigo-200/80 bg-white/95 px-3.5 py-2.5 text-slate-900 shadow-md shadow-indigo-500/5 backdrop-blur dark:border-indigo-900/70 dark:bg-slate-900/95 dark:text-slate-100",
      icon:
        "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-400",
      text:
        "text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100",
    };
  }

  return {
    container:
      "min-w-[120px] max-w-[170px] rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-slate-700 shadow-sm backdrop-blur transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300",
    icon:
      "bg-slate-500/10 text-slate-400",
    text:
      "text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400",
  };
}

function NodeIcon({ depth }: { depth: number }) {
  if (depth === 0) {
    return <Sparkles className="size-4" />;
  }

  if (depth === 1) {
    return <Layers className="size-3.5" />;
  }

  return <FileText className="size-3" />;
}

function MindMapNodeComponent({
  data,
}: NodeProps) {
  const nodeData = data as MindMapNodeData;

  const depth = nodeData.depth ?? 0;
  const styles = getNodeStyles(depth);

  return (
    <div className="relative">
      {/* Invisible connection handles.
          React Flow needs these for edge routing,
          but they are intentionally not visible. */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />

      <div
        className={[
          "group relative flex items-center justify-center gap-2",
          "select-none text-center transition-all duration-200",
          "hover:-translate-y-0.5",
          styles.container,
        ].join(" ")}
      >
        <span
          className={[
            "flex shrink-0 items-center justify-center rounded-md p-1.5",
            styles.icon,
          ].join(" ")}
        >
          <NodeIcon depth={depth} />
        </span>

        <span
          className={[
            "line-clamp-2 break-words",
            styles.text,
          ].join(" ")}
        >
          {nodeData.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);

MindMapNode.displayName = "MindMapNode";