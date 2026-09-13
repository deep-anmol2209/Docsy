// "use client";

// import { useMemo, useState } from "react";
// import type { MindMapData, MindMapNode } from "@/types";
// import {
//   FileText,
//   Layers,
//   RotateCcw,
//   Sparkles,
//   ZoomIn,
//   ZoomOut,
// } from "lucide-react";

// type MindMapRendererProps = {
//   data: MindMapData;
// };

// type PositionedNode = {
//   id: string;
//   label: string;
//   depth: number;
//   x: number;
//   y: number;
//   hasChildren: boolean;
//   parentId?: string;
//   children: PositionedNode[];
// };

// const NODE_WIDTH = 150;
// const NODE_HEIGHT = 44;

// const HORIZONTAL_GAP = 90;
// const VERTICAL_GAP = 100;

// const ROOT_WIDTH = 190;
// const ROOT_HEIGHT = 52;

// function getDepthStyles(depth: number) {
//   switch (depth) {
//     case 0:
//       return {
//         card:
//           "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white border-indigo-400/40 shadow-xl shadow-indigo-500/30",
//         label: "text-sm font-bold text-white",
//         icon: <Sparkles className="size-4 text-indigo-100" />,
//       };

//     case 1:
//       return {
//         card:
//           "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-indigo-200 dark:border-indigo-900/70 shadow-md",
//         label: "text-xs font-semibold",
//         icon: <Layers className="size-3.5 text-indigo-500" />,
//       };

//     default:
//       return {
//         card:
//           "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 shadow-sm",
//         label: "text-[11px] font-medium",
//         icon: <FileText className="size-3 text-slate-400" />,
//       };
//   }
// }

// /**
//  * Returns the number of leaf nodes contained in a subtree.
//  *
//  * We use this to distribute horizontal space according to the
//  * actual size of each subtree instead of giving every child
//  * the same amount of space.
//  */
// function getLeafCount(node: MindMapNode): number {
//   const children = node.children ?? [];

//   if (children.length === 0) {
//     return 1;
//   }

//   return children.reduce(
//     (total, child) => total + getLeafCount(child),
//     0
//   );
// }

// /**
//  * Calculates the maximum depth of the tree.
//  */
// function getMaxDepth(node: MindMapNode): number {
//   const children = node.children ?? [];

//   if (children.length === 0) {
//     return 0;
//   }

//   return (
//     1 +
//     Math.max(
//       ...children.map((child) => getMaxDepth(child))
//     )
//   );
// }

// /**
//  * Creates a top-to-bottom tree layout.
//  *
//  * Important:
//  * - The LLM does NOT provide positions.
//  * - Positions are calculated entirely by the UI.
//  * - Subtrees receive space proportional to their size.
//  */
// function createTreeLayout(root: MindMapNode) {
//   const maxDepth = getMaxDepth(root);

//   const levelHeights = Array.from(
//     { length: maxDepth + 1 },
//     (_, depth) => depth * (NODE_HEIGHT + VERTICAL_GAP) + 100
//   );

//   const positioned: PositionedNode[] = [];

//   let nextLeafX = 100;

//   function visit(
//     node: MindMapNode,
//     depth: number,
//     parentId?: string
//   ): PositionedNode {
//     const children = node.children ?? [];
//     const hasChildren = children.length > 0;

//     let childrenPositioned: PositionedNode[] = [];

//     if (hasChildren) {
//       childrenPositioned = children.map((child) =>
//         visit(child, depth + 1, node.id)
//       );
//     }

//     let x: number;

//     if (childrenPositioned.length === 0) {
//       x = nextLeafX;
//       nextLeafX += NODE_WIDTH + HORIZONTAL_GAP;
//     } else {
//       const first = childrenPositioned[0];
//       const last =
//         childrenPositioned[childrenPositioned.length - 1];

//       x = (first.x + last.x) / 2;
//     }

//     const current: PositionedNode = {
//       id: node.id,
//       label: node.label,
//       depth,
//       x,
//       y: levelHeights[depth],
//       hasChildren,
//       parentId,
//       children: childrenPositioned,
//     };

//     positioned.push(current);

//     return current;
//   }

//   const tree = visit(root, 0, "root");

//   /**
//    * Center the root and entire tree around the viewport.
//    */
//   const minX = Math.min(...positioned.map((node) => node.x));
//   const maxX = Math.max(...positioned.map((node) => node.x));

//   const treeWidth = maxX - minX;

//   const offsetX =
//     treeWidth < 1000
//       ? (1000 - treeWidth) / 2 - minX
//       : -minX + 100;

//   positioned.forEach((node) => {
//     node.x += offsetX;
//   });

//   return {
//     tree,
//     nodes: positioned,
//     width: Math.max(treeWidth + 200, 1000),
//     height:
//       (maxDepth + 1) * (NODE_HEIGHT + VERTICAL_GAP) + 150,
//   };
// }

// function flattenConnections(
//   node: PositionedNode,
//   result: {
//     parent: PositionedNode;
//     child: PositionedNode;
//   }[] = []
// ) {
//   for (const child of node.children) {
//     result.push({
//       parent: node,
//       child,
//     });

//     flattenConnections(child, result);
//   }

//   return result;
// }

// export function MindMapRenderer({
//   data,
// }: MindMapRendererProps) {
//   const [zoom, setZoom] = useState(1);

//   const layout = useMemo(() => {
//     if (!data?.root) {
//       return null;
//     }

//     return createTreeLayout(data.root);
//   }, [data]);

//   if (!layout) {
//     return (
//       <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
//         <Layers className="mb-3 size-6 text-muted-foreground" />

//         <p className="text-sm font-medium">
//           No mind map data available
//         </p>

//         <p className="mt-1 text-xs text-muted-foreground">
//           The artifact does not contain a valid mind map.
//         </p>
//       </div>
//     );
//   }

//   const connections = flattenConnections(layout.tree);

//   return (
//     <div className="relative overflow-hidden rounded-xl border bg-slate-950/5 dark:bg-slate-950">
//       {/* Controls */}
//       <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-lg backdrop-blur">
//         <button
//           type="button"
//           onClick={() =>
//             setZoom((value) =>
//               Math.min(value + 0.1, 1.8)
//             )
//           }
//           className="rounded-md p-2 hover:bg-muted"
//           title="Zoom in"
//         >
//           <ZoomIn className="size-4" />
//         </button>

//         <button
//           type="button"
//           onClick={() =>
//             setZoom((value) =>
//               Math.max(value - 0.1, 0.5)
//             )
//           }
//           className="rounded-md p-2 hover:bg-muted"
//           title="Zoom out"
//         >
//           <ZoomOut className="size-4" />
//         </button>

//         <div className="mx-1 h-4 w-px bg-border" />

//         <button
//           type="button"
//           onClick={() => setZoom(1)}
//           className="rounded-md p-2 hover:bg-muted"
//           title="Reset zoom"
//         >
//           <RotateCcw className="size-4" />
//         </button>
//       </div>

//       {/* Viewport */}
//       <div className="h-[700px] overflow-auto">
//         <div
//           className="flex min-h-full min-w-full items-center justify-center p-10"
//           style={{
//             minWidth: layout.width * zoom + 80,
//             minHeight: layout.height * zoom + 80,
//           }}
//         >
//           <div
//             className="relative transition-transform duration-200"
//             style={{
//               width: layout.width,
//               height: layout.height,
//               transform: `scale(${zoom})`,
//               transformOrigin: "center center",
//             }}
//           >
//             {/* Edges */}
//             <svg
//               className="pointer-events-none absolute inset-0 z-0"
//               width={layout.width}
//               height={layout.height}
//             >
//               {connections.map(({ parent, child }) => {
//                 const parentX = parent.x;
//                 const parentY =
//                   parent.y +
//                   (parent.depth === 0
//                     ? ROOT_HEIGHT / 2
//                     : NODE_HEIGHT / 2);

//                 const childX = child.x;
//                 const childY =
//                   child.y - NODE_HEIGHT / 2;

//                 const middleY =
//                   (parentY + childY) / 2;

//                 const stroke =
//                   child.depth === 1
//                     ? "#818cf8"
//                     : "#94a3b8";

//                 return (
//                   <path
//                     key={`${parent.id}-${child.id}`}
//                     d={`
//                       M ${parentX} ${parentY}
//                       C ${parentX} ${middleY},
//                         ${childX} ${middleY},
//                         ${childX} ${childY}
//                     `}
//                     fill="none"
//                     stroke={stroke}
//                     strokeWidth={
//                       child.depth === 1 ? 2.5 : 1.5
//                     }
//                     strokeOpacity={
//                       child.depth === 1 ? 0.65 : 0.4
//                     }
//                   />
//                 );
//               })}
//             </svg>

//             {/* Nodes */}
//             <div className="absolute inset-0 z-10">
//               {layout.nodes.map((node) => (
//                 <MindMapNodeView
//                   key={node.id}
//                   node={node}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function MindMapNodeView({
//   node,
// }: {
//   node: PositionedNode;
// }) {
//   const styles = getDepthStyles(node.depth);

//   const isRoot = node.depth === 0;

//   const width = isRoot
//     ? ROOT_WIDTH
//     : NODE_WIDTH;

//   const height = isRoot
//     ? ROOT_HEIGHT
//     : NODE_HEIGHT;

//   return (
//     <div
//       className="absolute"
//       style={{
//         left: node.x,
//         top: node.y,
//         width,
//         height,
//         transform: "translate(-50%, -50%)",
//       }}
//     >
//       <div
//         className={[
//           "flex h-full w-full items-center justify-center gap-2 rounded-xl border",
//           "px-3 text-center transition-all duration-200",
//           "hover:-translate-y-0.5 hover:shadow-lg",
//           styles.card,
//         ].join(" ")}
//       >
//         <span className="shrink-0">
//           {styles.icon}
//         </span>

//         <span
//           className={[
//             "line-clamp-2 leading-tight",
//             styles.label,
//           ].join(" ")}
//         >
//           {node.label}
//         </span>
//       </div>
//     </div>
//   );
// }