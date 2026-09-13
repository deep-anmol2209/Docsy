import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";

import type { MindMapNode as MindMapDataNode } from "@/types";

export type MindMapNodeData = {
  label: string;
  depth: number;
  hasChildren: boolean;
};

export type MindMapLayout = {
  nodes: Node<MindMapNodeData>[];
  edges: Edge[];
};

const ROOT_RADIUS = 0;

const LEVEL_RADIUS: Record<number, number> = {
  1: 330,
  2: 230,
  3: 190,
  4: 170,
};

const DEFAULT_RADIUS = 160;

/**
 * Keeps the angular distribution stable when a node has
 * many children.
 */
function getAngularPadding(childCount: number) {
  if (childCount <= 2) return 0.08;
  if (childCount <= 4) return 0.05;
  if (childCount <= 8) return 0.025;

  return 0.01;
}

function getRadius(depth: number) {
  return LEVEL_RADIUS[depth] ?? DEFAULT_RADIUS;
}

/**
 * Determines which side of the node the edge should connect to.
 *
 * Radial layout:
 *
 *          TOP
 *           ↑
 *     LEFT ← ROOT → RIGHT
 *           ↓
 *         BOTTOM
 */
function getHandlePositions(angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  if (Math.abs(cos) > Math.abs(sin)) {
    if (cos >= 0) {
      return {
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    }

    return {
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
    };
  }

  if (sin >= 0) {
    return {
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  }

  return {
    sourcePosition: Position.Top,
    targetPosition: Position.Bottom,
  };
}

/**
 * Recursively converts the backend tree into React Flow nodes
 * and edges.
 */
function layoutChildren(
  parent: MindMapDataNode,
  parentX: number,
  parentY: number,
  depth: number,
  startAngle: number,
  endAngle: number,
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
) {
  const children = parent.children ?? [];

  if (!children.length) {
    return;
  }

  const childCount = children.length;
  const sector = endAngle - startAngle;
  const sectorPerChild = sector / childCount;

  const padding = getAngularPadding(childCount);

  children.forEach((child, index) => {
    const rawStart =
      startAngle + index * sectorPerChild;

    const rawEnd =
      rawStart + sectorPerChild;

    const childStart =
      rawStart + sectorPerChild * padding;

    const childEnd =
      rawEnd - sectorPerChild * padding;

    const angle =
      (childStart + childEnd) / 2;

    const radius = getRadius(depth);

    const x =
      parentX +
      Math.cos(angle) * radius;

    const y =
      parentY +
      Math.sin(angle) * radius;

    const handles = getHandlePositions(angle);

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

      sourcePosition: handles.sourcePosition,
      targetPosition: handles.targetPosition,

      draggable: true,
      selectable: true,
    });

    edges.push({
      id: `${parent.id}->${child.id}`,
      source: parent.id,
      target: child.id,
      type: "mindMap",

      data: {
        depth,
      },

      animated: false,
      selectable: false,
    });

    /*
     * Give deeper children their own angular sector.
     *
     * This is important because we don't simply distribute
     * every node around the root. Each branch gets its own
     * region, which prevents unrelated branches crossing.
     */
    layoutChildren(
      child,
      x,
      y,
      depth + 1,
      childStart,
      childEnd,
      nodes,
      edges,
    );
  });
}

export function createMindMapLayout(
  data: { root: MindMapDataNode },
): MindMapLayout {
  const nodes: Node<MindMapNodeData>[] = [];
  const edges: Edge[] = [];

  const root = data.root;

  if (!root) {
    return {
      nodes,
      edges,
    };
  }

  /*
   * Root node.
   */
  nodes.push({
    id: root.id,
    type: "mindMap",

    position: {
      x: 0,
      y: 0,
    },

    data: {
      label: root.label,
      depth: 0,
      hasChildren: Boolean(root.children?.length),
    },

    sourcePosition: Position.Right,
    targetPosition: Position.Left,

    draggable: true,
    selectable: true,
  });

  /*
   * Start first-level branches around the entire circle.
   *
   * Starting from -90° makes the first branch appear from
   * the top instead of the right side.
   */
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2;

  layoutChildren(
    root,
    0,
    0,
    1,
    startAngle,
    endAngle,
    nodes,
    edges,
  );

  return {
    nodes,
    edges,
  };
}