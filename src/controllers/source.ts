import { NextRequest, NextResponse } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { auth } from "@/lib/auth";

import {
  handlePdfSource,
  handleNonPdfSource,
  deleteSourceService,
  retrySource,
} from "@/src/services/source/source-service";

import {
  createSourceDbSchema,
 
  workspaceIdParamSchema,
} from "@/src/validators/source-validator";

import { getWorkspaceByIdForUser } from "@/src/repositories/workspace.repository";


/**
 * Create PDF source
 *
 * Responsibilities:
 * - Authenticate user
 * - Validate workspace
 * - Verify workspace ownership
 * - Pass FormData to source service
 */
export async function createPdfSource(
  request: NextRequest,
  workspaceId: string,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { workspaceId: validatedWorkspaceId } =
    workspaceIdParamSchema.parse({
      workspaceId,
    });

  const workspace = await getWorkspaceByIdForUser(
    validatedWorkspaceId,
    session.user.id,
  );

  if (!workspace) {
    return NextResponse.json(
      {
        error: "Workspace not found",
      },
      {
        status: 404,
      },
    );
  }

  const formData = await request.formData();

  const result = await handlePdfSource(
    formData,
    validatedWorkspaceId,
    session.user.id,
  );

  return jsonSuccess(result, "Source created successfully", 201);
}


/**
 * Create non-PDF source
 *
 * Responsibilities:
 * - Authenticate user
 * - Validate workspace
 * - Verify workspace ownership
 * - Validate source-specific input
 * - Pass validated data to source service
 */
export async function createNonPdfSource(
  request: NextRequest,
  workspaceId: string,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { workspaceId: validatedWorkspaceId } =
    workspaceIdParamSchema.parse({
      workspaceId,
    });

  const workspace = await getWorkspaceByIdForUser(
    validatedWorkspaceId,
    session.user.id,
  );

  if (!workspace) {
    return NextResponse.json(
      {
        error: "Workspace not found",
      },
      {
        status: 404,
      },
    );
  }

  const body = await request.json();

  let input;

  switch (body.type) {
    case "TEXT":
      input = createSourceDbSchema.parse(body);
      break;

    case "MARKDOWN":
      input = createSourceDbSchema.parse(body);
      break;

    case "WEBSITE":
      input = createSourceDbSchema.parse(body);
      break;

    case "YOUTUBE":
      input = createSourceDbSchema.parse(body);
      break;

    default:
      return NextResponse.json(
        {
          error: "Unsupported source type",
        },
        {
          status: 400,
        },
      );
  }

  const result = await handleNonPdfSource(
    {
      sourceType: body.type,
      title: input.title,
      url: "url" in input ? input.url : undefined,
      text: "content" in input ? input.content : undefined,
    },
    validatedWorkspaceId,
    session.user.id,
  );

  return jsonSuccess(result, "Source created successfully", 201);
}

/**
 * Delete source
 *
 * Responsibilities:
 * - Authenticate user
 * - Validate workspace
 * - Verify workspace ownership
 * - Delete source and its related data
 */
export async function deleteSource(
  request: NextRequest,
  workspaceId: string,
  sourceId: string,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { workspaceId: validatedWorkspaceId } =
    workspaceIdParamSchema.parse({
      workspaceId,
    });

  const workspace = await getWorkspaceByIdForUser(
    validatedWorkspaceId,
    session.user.id,
  );

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 },
    );
  }

  if (!sourceId) {
    return NextResponse.json(
      { error: "Source ID is required" },
      { status: 400 },
    );
  }

  const result = await deleteSourceService(
    sourceId,
    validatedWorkspaceId,
    session.user.id,
  );

  return NextResponse.json(result, {
    status: 200,
  });
}

/**
 * Retry source ingestion
 *
 * Responsibilities:
 * - Authenticate user
 * - Validate workspace
 * - Verify workspace ownership
 * - Reset source/job state
 * - Trigger ingestion pipeline again
 */
export async function retrySourceController(
  request: NextRequest,
  workspaceId: string,
  sourceId: string,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { workspaceId: validatedWorkspaceId } =
    workspaceIdParamSchema.parse({
      workspaceId,
    });

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

  const workspace = await getWorkspaceByIdForUser(
    validatedWorkspaceId,
    session.user.id,
  );

  if (!workspace) {
    return NextResponse.json(
      {
        error: "Workspace not found",
      },
      {
        status: 404,
      },
    );
  }

  const result = await retrySource(
    sourceId,
    validatedWorkspaceId,
    session.user.id,
  );

  return NextResponse.json(result, {
    status: 200,
  });
}