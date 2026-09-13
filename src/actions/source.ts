import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { inngest } from "@/lib/ingest/ingest-client";
import { SOURCE_INGESTION_REQUESTED_EVENT } from "@/src/inngest/client";

import {
  JobState,
  KNOWN_SOURCE_TYPES,
  DocumentType,
} from "@/src/common-types/enums";

import { documentsRepository } from "@/src/repositories/document-repository";
import { jobsRepository } from "@/src/repositories/job-repository";
import { createSource } from "@/src/repositories/source-repository";

import { randomUUID } from "crypto";
import { uploadPdfToCloudinary } from "@/lib/upload-pdf";

async function getSessionUserId(): Promise<string> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (e) {
    // ignore
  }
  return "user-01";
}

export async function handlePdfSource(formData: FormData, userId?: string) {
  const ownerUserId = userId ?? (await getSessionUserId());

  const file = formData.get("file") as File;
  const notebookId = formData.get("notebookId") as string | null;
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

  console.log('[Cloudinary Upload Success]', upload.secure_url, upload.public_id);

  const storageKey = upload.secure_url;
  const fileName = file.name;
  const mimeType = file.type;
  const fileSizeBytes = file.size;

  return createSourceJob({
    ownerUserId,
    notebookId: notebookId ?? undefined,
    sourceType: KNOWN_SOURCE_TYPES.PDF,
    title: title ?? file.name,
    storageKey,
    publicId: upload.public_id,
    fileName,
    mimeType,
    fileSizeBytes,
  });
}

export async function handleNonPdfSource(data: {
  sourceType: string;
  title?: string;
  notebookId?: string;
  url?: string;
  text?: string;
}, userId?: string) {
  const ownerUserId = userId ?? (await getSessionUserId());

  return createSourceJob({
    ownerUserId,
    notebookId: data.notebookId,
    sourceType: data.sourceType,
    title: data.title,
    url: data.url,
    text: data.text,
  });
}


async function createSourceJob(input: {
  ownerUserId: string;
  sourceType: string;
  notebookId?: string;
  title?: string;
  url?: string;
  text?: string;
  publicId?: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}) {
  const sourceId = `src_${randomUUID()}`;
  const docId = `doc_${randomUUID()}`;
  const jobId = `job_${randomUUID()}`;

  const source = await createSource({
    id: sourceId,
    workspaceId: "ws-default",
    ownerUserId: input.ownerUserId,
    notebookId: input.notebookId,
    sourceType: input.sourceType,
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

  let docType = DocumentType.STRUCTURED;
  if (input.sourceType === KNOWN_SOURCE_TYPES.PDF) docType = DocumentType.RESEARCH_PAPER;
  if (input.sourceType === KNOWN_SOURCE_TYPES.YOUTUBE) docType = DocumentType.TRANSCRIPT;
  if (input.sourceType === KNOWN_SOURCE_TYPES.TEXT) docType = DocumentType.NOTES;

  await documentsRepository.createDoc({
    sourceId,
    title: source.title,
    documentType: docType as any,
    language: "en",
    chunkCount: 0,
    parserName: `${input.sourceType.toUpperCase()}Parser`,
    parserVersion: "1.0.0",
    analyzerVersion: "1.0.0",
    isScanned: false,
    requiresOCR: false,
  });

  const job = await jobsRepository.createJob({
    sourceId,
    state: JobState.QUEUED as any,
    currentStage: JobState.QUEUED as any,
    retryCount: 0,
    maxRetries: 3,
    checkpoints: {
      parserCompleted: false,
      normalizationCompleted: false,
      analysisCompleted: false,
      chunkCompleted: false,
      embeddingCompleted: false,
      vectorCompleted: false,
    } as any,

  });

  console.log(`[PRODUCER] 🚀 Sending event '${SOURCE_INGESTION_REQUESTED_EVENT}' to Inngest for source '${sourceId}', job '${jobId}'...`);

  await inngest.send({
    name: SOURCE_INGESTION_REQUESTED_EVENT,
    data: {
      sourceId,
      jobId: job.id,
    },
  });

  return {
    source,
    job,
  };
}