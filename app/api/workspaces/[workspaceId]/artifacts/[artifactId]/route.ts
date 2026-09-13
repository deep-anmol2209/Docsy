

import {
  getArtifact,
  updateArtifact,
  deleteArtifact,
} from "@/src/controllers/artifact";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(getArtifact);

export const PATCH = withErrorHandler(updateArtifact);

export const DELETE = withErrorHandler(deleteArtifact);