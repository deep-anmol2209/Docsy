// import { inngest } from "@/lib/ingest/ingest-client";
// import { SOURCE_INGESTION_REQUESTED_EVENT } from "@/src/inngest/client";

// import {
//   DocumentType,
//   JobState,
//   KNOWN_SOURCE_TYPES,
//   SourceType,
// } from "@/src/common-types/enums";

// import { documentsRepository } from "@/src/repositories/document-repository";
// import { jobsRepository } from "@/src/repositories/job-repository";
// import { createSource } from "@/src/repositories/source-repository";

// import { uploadPdfToCloudinary } from "@/lib/upload-pdf";


// /**
//  * Creates a PDF source.
//  *
//  * Responsibilities:
//  * - Validate the uploaded PDF
//  * - Upload the PDF to Cloudinary
//  * - Create Source
//  * - Create Document
//  * - Create Job
//  * - Trigger the ingestion pipeline
//  *
//  * Authentication and workspace ownership are handled by the controller.
//  */
// export async function handlePdfSource(
//   formData: FormData,
//   workspaceId: string,
//   userId: string,
// ) {
//   const file = formData.get("file") as File | null;
//   const title = formData.get("title") as string | null;

//   if (!file) {
//     throw new Error("File is required");
//   }

//   if (file.type !== "application/pdf") {
//     throw new Error("Only PDF files are allowed.");
//   }

//   if (file.size > 20 * 1024 * 1024) {
//     throw new Error("Maximum file size is 20 MB.");
//   }

//   const upload = await uploadPdfToCloudinary(file);

//   return createSourceJob({
//     workspaceId,
//     userId,
//     sourceType: KNOWN_SOURCE_TYPES.PDF,
//     title: title ?? file.name,
//     storageKey: upload.secure_url,
//     publicId: upload.public_id,
//     fileName: file.name,
//     mimeType: file.type,
//     fileSizeBytes: file.size,
//   });
// }


// /**
//  * Creates a non-PDF source such as:
//  * - TEXT
//  * - MARKDOWN
//  * - WEBSITE
//  * - YOUTUBE
//  */
// export async function handleNonPdfSource(
//   data: {
//     sourceType: string;
//     title?: string;
//     url?: string;
//     text?: string;
//   },
//   workspaceId: string,
//   userId: string,
// ) {
//   return createSourceJob({
//     workspaceId,
//     userId,
//     sourceType: data.sourceType,
//     title: data.title,
//     url: data.url,
//     text: data.text,
//   });
// }


// /**
//  * Creates all database records required for ingestion
//  * and triggers the asynchronous Inngest pipeline.
//  */
// async function createSourceJob(input: {
//   workspaceId: string;
//   userId: string;
//   sourceType: string;
//   title?: string;
//   url?: string;
//   text?: string;
//   publicId?: string;
//   storageKey?: string;
//   fileName?: string;
//   mimeType?: string;
//   fileSizeBytes?: number;
// }) {
//   /*
//    * userId is intentionally accepted here because the service
//    * receives an already-authenticated user context from the controller.
//    *
//    * Ownership has already been verified before reaching this service.
//    */
//   void input.userId;
// console.log("[SOURCE JOB] Starting...", {
//     workspaceId: input.workspaceId,
//     sourceType: input.sourceType,
//   });
//   const normalizedType = input.sourceType.toUpperCase();

//   const sourceType = normalizedType as SourceType;
// console.log("[SOURCE JOB] Creating source...");

//   const source = await createSource({
//     workspaceId: input.workspaceId,

//     type: sourceType,
//     sourceType: normalizedType,

//     title: input.title ?? "Untitled",

//     url: input.url,
//     content: input.text,

//     cloudinaryPublicId: input.publicId,
//     cloudinarySecureUrl: input.storageKey,

//     originalReference: input.url ?? input.fileName,
//     storageLocation: input.storageKey,

//     mimeType: input.mimeType,
//     fileSizeBytes: input.fileSizeBytes,

//     ingestionStatus: JobState.QUEUED,
//   });
//  console.log("[SOURCE JOB] Source created:", source.id);
//   let documentType = DocumentType.STRUCTURED;

//   if (normalizedType === "PDF") {
//     documentType = DocumentType.RESEARCH_PAPER;
//   }

//   if (normalizedType === "YOUTUBE") {
//     documentType = DocumentType.TRANSCRIPT;
//   }

//   if (normalizedType === "TEXT") {
//     documentType = DocumentType.NOTES;
//   }
//  console.log("[SOURCE JOB] Creating document...");
//   const document = await documentsRepository.createDocument({
//     sourceId: source.id,

//     title: source.title,

//     documentType,

//     language: "en",

//     chunkCount: 0,

//     parserName: `${normalizedType}Parser`,
//     parserVersion: "1.0.0",
//     analyzerVersion: "1.0.0",

//     isScanned: false,
//     requiresOCR: false,
//   });
// console.log("[SOURCE JOB] Document created:", document.id);

//   console.log("[SOURCE JOB] Creating job...");
//   const job = await jobsRepository.createJob({
//     sourceId: source.id,

//     state: JobState.QUEUED,
//     currentStage: JobState.QUEUED,

//     retryCount: 0,
//     maxRetries: 3,

//     checkpoints: {
//       parserCompleted: false,
//       normalizationCompleted: false,
//       analysisCompleted: false,
//       chunkCompleted: false,
//       embeddingCompleted: false,
//       vectorCompleted: false,
//     },
//   });
//   console.log("[SOURCE JOB] Job created:", job.id);

//   console.log("[SOURCE JOB] Sending Inngest event...");
//   await inngest.send({
//     name: SOURCE_INGESTION_REQUESTED_EVENT,

//     data: {
//       sourceId: source.id,
//       jobId: job.id,
//       documentId: document.id,
//     },
//   });
//  console.log("[SOURCE JOB] ✅ Inngest event sent");
//   return {
//     source,
//     document,
//     job,
//   };
// }

import { inngest } from "@/lib/ingest/ingest-client";
import { SOURCE_INGESTION_REQUESTED_EVENT } from "@/src/inngest/client";

import {
  DocumentType,
  JobState,
  KNOWN_SOURCE_TYPES,
  SourceType,
} from "@/src/common-types/enums";

import { documentsRepository } from "@/src/repositories/document-repository";
import { jobsRepository } from "@/src/repositories/job-repository";
import {
  createSource,
  deleteSourceForWorkspace,
  resetSourceForRetry,
} from "@/src/repositories/source-repository";

import { uploadPdfToCloudinary } from "@/lib/upload-pdf";
import { isYouTubeUrl } from "@/lib/utils";
import { defaultIndexName, getPineconeClient } from "@/lib/pinecone";

/**
 * Creates a PDF source.
 *
 * Responsibilities:
 * - Validate the uploaded PDF
 * - Upload the PDF to Cloudinary
 * - Create Source
 * - Create Document
 * - Create Job
 * - Trigger the ingestion pipeline
 *
 * Authentication and workspace ownership are handled by the controller.
 */
export async function handlePdfSource(
  formData: FormData,
  workspaceId: string,
  userId: string,
) {
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file) {
    throw new Error("File is required");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Maximum file size is 20 MB.");
  }

  const upload = await uploadPdfToCloudinary(file);

  return createSourceJob({
    workspaceId,
    userId,
    sourceType: KNOWN_SOURCE_TYPES.PDF,
    title: title ?? file.name,
    storageKey: upload.secure_url,
    publicId: upload.public_id,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
  });
}


/**
 * Creates a non-PDF source such as:
 * - TEXT
 * - MARKDOWN
 * - WEBSITE
 * - YOUTUBE
 */
export async function handleNonPdfSource(
  data: {
    sourceType: string;
    title?: string;
    url?: string;
    text?: string;
  },
  workspaceId: string,
  userId: string,
) {
  let sourceType = data.sourceType;
  if (data.url && isYouTubeUrl(data.url)) {
    sourceType = "YOUTUBE";
  }

  return createSourceJob({
    workspaceId,
    userId,
    sourceType,
    title: data.title,
    url: data.url,
    text: data.text,
  });
}


/**
 * Deletes a source from the workspace.
 *
 * Responsibilities:
 * - Verify source belongs to workspace/user through repository
 * - Delete source and its related database records
 *
 * Authentication is handled by the controller.
 */
export async function deleteSourceService(
  sourceId: string,
  workspaceId: string,
  userId: string,
) {
  console.log("[SOURCE DELETE] Starting...", {
    sourceId,
    workspaceId,
  });

  const deleted = await deleteSourceForWorkspace(
    workspaceId,
    sourceId,
    userId,
  );

  if (!deleted) {
    throw new Error("Source not found");
  }
 const pinecone = getPineconeClient();
const indexName = defaultIndexName
 if (pinecone ) {
    try {
      console.log("[SOURCE DELETE] Pinecone delete starting", {
  indexName,
  namespace: "__default__",
  sourceId,
});

const index = pinecone.index(indexName);

const result = await index.deleteMany({
  filter: {
    sourceId: { $eq: sourceId },
  },
});
   

      console.log("[SOURCE DELETE] Deleted vectors:", result);
      
    } catch(error){
      console.error("[SOURCE DELETE] Error deleting vectors:", error);
    }
  console.log("[SOURCE DELETE] ✅ Source deleted:", sourceId);

  return {
    sourceId,
    deleted: true,
  };
 }}


/**
 * Creates all database records required for ingestion
 * and triggers the asynchronous Inngest pipeline.
 */
async function createSourceJob(input: {
  workspaceId: string;
  userId: string;
  sourceType: string;
  title?: string;
  url?: string;
  text?: string;
  publicId?: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}) {
  /*
   * userId is intentionally accepted here because the service
   * receives an already-authenticated user context from the controller.
   *
   * Ownership has already been verified before reaching this service.
   */
  void input.userId;

  console.log("[SOURCE JOB] Starting...", {
    workspaceId: input.workspaceId,
    sourceType: input.sourceType,
  });

  const normalizedType = input.sourceType.toUpperCase();

  const sourceType = normalizedType as SourceType;

  console.log("[SOURCE JOB] Creating source...");

  const source = await createSource({
    workspaceId: input.workspaceId,

    type: sourceType,
    sourceType: normalizedType,

    title: input.title ?? "Untitled",

    url: input.url,
    content: input.text,

    cloudinaryPublicId: input.publicId,
    cloudinarySecureUrl: input.storageKey,

    originalReference: input.url ?? input.fileName,
    storageLocation: input.storageKey,

    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,

    ingestionStatus: JobState.QUEUED,
  });

  console.log("[SOURCE JOB] Source created:", source.id);

  let documentType = DocumentType.STRUCTURED;

  if (normalizedType === "PDF") {
    documentType = DocumentType.RESEARCH_PAPER;
  }

  if (normalizedType === "YOUTUBE") {
    documentType = DocumentType.TRANSCRIPT;
  }

  if (normalizedType === "TEXT") {
    documentType = DocumentType.NOTES;
  }

  console.log("[SOURCE JOB] Creating document...");

  const document = await documentsRepository.createDocument({
    sourceId: source.id,

    title: source.title,

    documentType,

    language: "en",

    chunkCount: 0,

    parserName: `${normalizedType}Parser`,
    parserVersion: "1.0.0",
    analyzerVersion: "1.0.0",

    isScanned: false,
    requiresOCR: false,
  });

  console.log("[SOURCE JOB] Document created:", document.id);

  console.log("[SOURCE JOB] Creating job...");

  const job = await jobsRepository.createJob({
    sourceId: source.id,

    state: JobState.QUEUED,
    currentStage: JobState.QUEUED,

    retryCount: 0,
    maxRetries: 3,

    checkpoints: {
      parserCompleted: false,
      normalizationCompleted: false,
      analysisCompleted: false,
      chunkCompleted: false,
      embeddingCompleted: false,
      vectorCompleted: false,
    },
  });

  console.log("[SOURCE JOB] Job created:", job.id);

  console.log("[SOURCE JOB] Sending Inngest event...");

  await inngest.send({
    name: SOURCE_INGESTION_REQUESTED_EVENT,

    data: {
      sourceId: source.id,
      jobId: job.id,
      documentId: document.id,
    },
  });

  console.log("[SOURCE JOB] ✅ Inngest event sent");

  return {
    source,
    document,
    job,
  };
}


/**
 * Retry a failed source ingestion.
 *
 * Responsibilities:
 * - Verify source belongs to the workspace/user
 * - Reset source status to QUEUED
 * - Reset the latest ingestion job
 * - Increment retry count
 * - Return the updated source/job
 *
 * Authentication and workspace ownership are handled by the controller.
 */
export async function retrySource(
  sourceId: string,
  workspaceId: string,
  userId: string,
) {
  console.log("[SOURCE RETRY] Starting...", {
    sourceId,
    workspaceId,
  });

  const result = await resetSourceForRetry(
    workspaceId,
    sourceId,
    userId,
  );

  if (!result) {
    throw new Error("Source not found");
  }

  if (!result.job) {
    throw new Error("Ingestion job not found for source");
  }

  if (!result.document) {
    throw new Error("Document not found for source");
  }

  await inngest.send({
    name: SOURCE_INGESTION_REQUESTED_EVENT,
    data: {
      sourceId: result.source.id,
      jobId: result.job.id,
      documentId: result.document.id,
    },
  });

  console.log("[SOURCE RETRY] ✅ Inngest event sent", {
    sourceId: result.source.id,
    jobId: result.job.id,
    documentId: result.document.id,
  });

  return result;
}