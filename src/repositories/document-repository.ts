import { prisma } from "@/lib/db";

import {
  CreateDocumentInput,
  UpdateDocumentInput,
} from "@/src/validators/document-validator";

export async function createDocument(input: CreateDocumentInput) {
  return prisma.document.create({
    data: input as any,
  });
}

export async function getDocumentById(documentId: string) {
  return prisma.document.findUnique({
    where: {
      id: documentId,
    },
    include: {
      source: true,
      chunks: true,
      blocks: true,
    },
  });
}

export async function getDocumentBySourceId(sourceId: string) {
  return prisma.document.findFirst({
    where: {
      sourceId,
    },
  });
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: input as any,
  });
}

export async function updateChunkCount(
  documentId: string,
  chunkCount: number,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      chunkCount,
    },
  });
}

export async function updateMetadataSummary(
  documentId: string,
  metadataSummary: Record<string, unknown>,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      metadataSummary: metadataSummary as any,
    },
  });
}


export async function markRequiresOCR(
  documentId: string,
  requiresOCR = true,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      requiresOCR,
    },
  });
}

export async function markScanned(
  documentId: string,
  isScanned = true,
) {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      isScanned,
    },
  });
}

export async function deleteDocument(documentId: string) {
  return prisma.document.delete({
    where: {
      id: documentId,
    },
  });
}

export const documentsRepository = {
  createDocument,
  createDoc: createDocument,
  getDocumentById,
  getDocumentBySourceId,
  updateDocument,
  updateChunkCount,
  updateMetadataSummary,
  markRequiresOCR,
  markScanned,
  deleteDocument,
};