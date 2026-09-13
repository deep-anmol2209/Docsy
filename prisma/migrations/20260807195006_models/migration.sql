-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('SUMMARY', 'STUDY_GUIDE', 'FAQ', 'TIMELINE', 'QUIZ', 'FLASHCARDS', 'NOTES', 'MIND_MAP', 'TABLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('GENERATING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('QUEUED', 'VALIDATING', 'PARSING', 'OCR', 'NORMALIZING', 'ANALYZING', 'SELECTING_STRATEGY', 'CHUNKING', 'ENRICHING', 'EMBEDDING', 'WRITING_TO_VECTOR_STORE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RESEARCH_PAPER', 'PRESENTATION', 'NOTES', 'INVOICE', 'TRANSCRIPT', 'BOOK', 'STRUCTURED', 'UNSTRUCTURED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('PARAGRAPH', 'HEADING', 'LIST_ITEM', 'TABLE', 'IMAGE_REFERENCE', 'CODE_BLOCK', 'QUOTE', 'SLIDE', 'TRANSCRIPT_SEGMENT');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PDF', 'WEBSITE', 'YOUTUBE', 'TEXT', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "originalReference" TEXT,
    "storageLocation" TEXT,
    "cloudinaryPublicId" TEXT,
    "cloudinarySecureUrl" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "ingestionStatus" "JobState" NOT NULL DEFAULT 'QUEUED',
    "uploadMetadata" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "page" INTEGER,
    "heading" TEXT,
    "section" TEXT,
    "startTimeSeconds" DOUBLE PRECISION,
    "endTimeSeconds" DOUBLE PRECISION,
    "slideNumber" INTEGER,
    "tokenCount" INTEGER,
    "storageLocation" TEXT,
    "enrichmentFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'UNKNOWN',
    "language" TEXT,
    "pageCount" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "parserName" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "analyzerVersion" TEXT NOT NULL,
    "isScanned" BOOLEAN NOT NULL DEFAULT false,
    "requiresOCR" BOOLEAN NOT NULL DEFAULT false,
    "metadataSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentBlock" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "page" INTEGER,
    "headingLevel" INTEGER,
    "slideNumber" INTEGER,
    "startTimeSeconds" DOUBLE PRECISION,
    "endTimeSeconds" DOUBLE PRECISION,
    "speaker" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'QUEUED',
    "currentStage" "JobState" NOT NULL DEFAULT 'QUEUED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "failureReason" TEXT,
    "checkpoints" JSONB,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStageHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" "JobState" NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "error" JSONB,

    CONSTRAINT "JobStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ArtifactType" NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'GENERATING',
    "content" TEXT,
    "metadata" JSONB,
    "generationPrompt" TEXT,
    "modelUsed" TEXT,
    "modelVersion" TEXT,
    "tokenUsage" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_source" (
    "artifactId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "artifact_source_pkey" PRIMARY KEY ("artifactId","sourceId")
);

-- CreateIndex
CREATE INDEX "source_workspaceId_idx" ON "source"("workspaceId");

-- CreateIndex
CREATE INDEX "source_workspaceId_type_idx" ON "source"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "source_ingestionStatus_idx" ON "source"("ingestionStatus");

-- CreateIndex
CREATE INDEX "source_type_idx" ON "source"("type");

-- CreateIndex
CREATE INDEX "Chunk_documentId_idx" ON "Chunk"("documentId");

-- CreateIndex
CREATE INDEX "Chunk_sourceId_idx" ON "Chunk"("sourceId");

-- CreateIndex
CREATE INDEX "Chunk_strategy_idx" ON "Chunk"("strategy");

-- CreateIndex
CREATE INDEX "Document_sourceId_idx" ON "Document"("sourceId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "DocumentBlock_documentId_idx" ON "DocumentBlock"("documentId");

-- CreateIndex
CREATE INDEX "DocumentBlock_order_idx" ON "DocumentBlock"("order");

-- CreateIndex
CREATE INDEX "Job_sourceId_idx" ON "Job"("sourceId");

-- CreateIndex
CREATE INDEX "Job_state_idx" ON "Job"("state");

-- CreateIndex
CREATE INDEX "JobStageHistory_jobId_idx" ON "JobStageHistory"("jobId");

-- CreateIndex
CREATE INDEX "artifact_workspaceId_idx" ON "artifact"("workspaceId");

-- CreateIndex
CREATE INDEX "artifact_workspaceId_type_idx" ON "artifact"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "artifact_status_idx" ON "artifact"("status");

-- CreateIndex
CREATE INDEX "artifact_createdAt_idx" ON "artifact"("createdAt");

-- CreateIndex
CREATE INDEX "artifact_source_sourceId_idx" ON "artifact_source"("sourceId");

-- AddForeignKey
ALTER TABLE "source" ADD CONSTRAINT "source_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBlock" ADD CONSTRAINT "DocumentBlock_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStageHistory" ADD CONSTRAINT "JobStageHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_source" ADD CONSTRAINT "artifact_source_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_source" ADD CONSTRAINT "artifact_source_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
