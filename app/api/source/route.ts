import { NextRequest, NextResponse } from 'next/server';
import { handlePdfSource, handleNonPdfSource } from '@/src/actions/source';
import { sourcesRepository } from '@/src/repositories/source-repository';
import { withErrorHandler } from '@/src/utils/error-handler';

// GET /api/source - List all sources with centralized error handling
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const notebookId = searchParams.get('notebookId') || undefined;

  const sources = await sourcesRepository.getAllSources(undefined, notebookId);
  return NextResponse.json({ sources });
});

// POST /api/source - Create source with centralized error handling
export const POST = withErrorHandler(async (req: NextRequest) => {
  console.log('[PRODUCER NEXT.JS API] 📥 Received create source request...');
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const result = await handlePdfSource(formData);
    return NextResponse.json(result, { status: 201 });
  }

  const body = await req.json();
  const result = await handleNonPdfSource(body);
  return NextResponse.json(result, { status: 201 });
});



