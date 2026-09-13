import { NextRequest, NextResponse } from "next/server";

import {
  deleteSource,
} from "@/src/controllers/source";

import { withErrorHandler } from "@/src/utils/error-handler";


export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    context: {
      params?: {
        workspaceId: string;
        sourceId: string;
      } | Promise<{
        workspaceId: string;
        sourceId: string;
      }>;
    },
  ) => {
    console.log(
      "[SOURCE API] 🗑️ Received delete source request...",
    );

    if (!context.params) {
      return NextResponse.json(
        {
          error: "Route parameters are required",
        },
        {
          status: 400,
        },
      );
    }

    const { workspaceId, sourceId } = await context.params;

    if (!workspaceId) {
      return NextResponse.json(
        {
          error: "Workspace ID is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!sourceId) {
      return NextResponse.json(
        {
          error: "Source ID is required",
        },
        {
          status: 400,
        },
      );
    }

    return deleteSource(
      request,
      workspaceId,
      sourceId,
    );
  },
);