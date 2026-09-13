


import { listArtifacts, createArtifact } from "@/src/controllers/artifact";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(listArtifacts);

export const POST = withErrorHandler(createArtifact);
