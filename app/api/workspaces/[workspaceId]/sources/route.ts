import { NextRequest, NextResponse } from "next/server";

import {
  createPdfSource,
  createNonPdfSource,
} from "@/src/controllers/source";

import { withErrorHandler } from "@/src/utils/error-handler";
import { sourcesRepository } from "@/src/repositories/source-repository";
import { jsonSuccess, jsonError } from "@/src/utils/api-response";

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    context: {
      params?: {
        workspaceId: string;
      } | Promise<{
        workspaceId: string;
      }>;
    },
  ) => {
    console.log(
      "[PRODUCER NEXT.JS API] 📥 Received create source request...",
    );

    if (!context.params) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 },
      );
    }

    const { workspaceId } = await context.params;

    const contentType =
      request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return createPdfSource(request, workspaceId);
    }

    return createNonPdfSource(request, workspaceId);
  },
);

// GET /api/workspaces/[workspaceId]/sources - List workspace sources
export const GET = withErrorHandler(
  async (
    req: NextRequest,
    context: {
      params?: {
        workspaceId: string;
      } | Promise<{
        workspaceId: string;
      }>;
    },
  ) => {
    if (!context.params) {
      return jsonError("Workspace ID is required", undefined, 400);
    }
    const { workspaceId } = await context.params;
    const sources = await sourcesRepository.listSourcesByWorkspace(workspaceId);
    return jsonSuccess({ sources });
  },
);