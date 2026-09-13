"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { MindMapData, MindMapNode as MindMapNodeData } from "@/types";

import { MindMapNode as MindMapNodeComponent } from "./mind-map-node";
import { MindMapEdge } from "./mind-map-edge";

type MindMapRendererProps = {
  data: MindMapData;
};

const nodeTypes = {
  mindMap: MindMapNodeComponent,
};

const edgeTypes = {
  mindMap: MindMapEdge,
};

/**
 * Creates a radial layout.
 *
 * Root stays in the center.
 * First-level children are distributed around it.
 * Deeper nodes are distributed inside their parent's angular sector.
 */
function buildMindMapLayout(data: MindMapData) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!data?.root) {
    return { nodes, edges };
  }

  const root = data.root;

  const centerX = 0;
  const centerY = 0;

  const firstLevelRadius = 360;
  const secondLevelRadius = 260;
  const thirdLevelRadius = 210;

  nodes.push({
    id: root.id,
    type: "mindMap",
    position: {
      x: centerX,
      y: centerY,
    },
    data: {
      label: root.label,
      depth: 0,
      hasChildren: Boolean(root.children?.length),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  function addChildren(
    parent: MindMapNodeData,
    parentX: number,
    parentY: number,
    depth: number,
    startAngle: number,
    endAngle: number,
  ) {
    const children = parent.children ?? [];

    if (children.length === 0) {
      return;
    }

    const radius =
      depth === 1
        ? firstLevelRadius
        : depth === 2
          ? secondLevelRadius
          : thirdLevelRadius;

    const sector = endAngle - startAngle;

    children.forEach((child, index) => {
      /*
       * Put the node in the middle of its angular sector.
       *
       * The small padding prevents branches from sitting directly
       * on top of each other when there are many children.
       */
      const padding = Math.min(sector * 0.08, 0.12);

      const childStart =
        startAngle + (sector / children.length) * index + padding;

      const childEnd =
        startAngle +
        (sector / children.length) * (index + 1) -
        padding;

      const angle = (childStart + childEnd) / 2;

      const x = parentX + Math.cos(angle) * radius;
      const y = parentY + Math.sin(angle) * radius;

      nodes.push({
        id: child.id,
        type: "mindMap",
        position: {
          x,
          y,
        },
        data: {
          label: child.label,
          depth,
          hasChildren: Boolean(child.children?.length),
        },

        /*
         * Handles are selected based on which side of the
         * radial layout the node is located.
         */
        sourcePosition:
          Math.cos(angle) >= 0
            ? Position.Right
            : Position.Left,

        targetPosition:
          Math.cos(angle) >= 0
            ? Position.Left
            : Position.Right,
      });

      edges.push({
        id: `${parent.id}-${child.id}`,
        source: parent.id,
        target: child.id,
        type: "mindMap",
        data: {
          depth,
        },
      });

      if (child.children?.length) {
        addChildren(
          child,
          x,
          y,
          depth + 1,
          childStart,
          childEnd,
        );
      }
    });
  }

  const children = root.children ?? [];

  /*
   * Full circle around the root.
   */
  addChildren(
    root,
    centerX,
    centerY,
    1,
    -Math.PI,
    Math.PI,
  );

  return {
    nodes,
    edges,
  };
}

export function MindMapRenderer({
  data,
}: MindMapRendererProps) {
  const layout = useMemo(
    () => buildMindMapLayout(data),
    [data],
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState(layout.nodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(layout.edges);

  /*
   * If a completely new artifact is loaded, rebuild the
   * React Flow state from the new structured data.
   */
  const handleInit = useCallback(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout.nodes, layout.edges, setNodes, setEdges]);

  if (!data?.root) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed">
        <div className="text-center">
          <p className="text-sm font-medium">
            No mind map data available
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The generated artifact does not contain a valid mind map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[720px] w-full overflow-hidden rounded-2xl border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={handleInit}
        fitView
        fitViewOptions={{
          padding: 0.25,
          minZoom: 0.25,
          maxZoom: 1.2,
        }}
        minZoom={0.15}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "mindMap",
        }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          gap={32}
          size={1}
          className="opacity-30"
        />

        <Controls
          showInteractive={false}
          position="bottom-right"
        />

        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor={(node) => {
            const depth =
              (node.data as { depth?: number })?.depth ?? 0;

            if (depth === 0) {
              return "#6366f1";
            }

            if (depth === 1) {
              return "#818cf8";
            }

            return "#cbd5e1";
          }}
          className="!rounded-xl !border !bg-background/80 !shadow-lg !backdrop-blur"
        />
      </ReactFlow>
    </div>
  );
}