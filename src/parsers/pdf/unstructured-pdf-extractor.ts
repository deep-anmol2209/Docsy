import * as fs from 'fs';
import * as path from 'path';
import { UnstructuredClient } from 'unstructured-client';
import { BlockType } from '../../common-types/enums';
import type { DocumentBlock } from '../../common-types/document-model';

export interface UnstructuredExtractionResult {
  readonly blocks: readonly DocumentBlock[];
  readonly rawElements: readonly any[];
  readonly pageCount: number;
}

function getClient(): UnstructuredClient {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;
  const serverURL = process.env.UNSTRUCTURED_API_URL;

  return new UnstructuredClient({
    security: {
      apiKeyAuth: apiKey || '',
    },
    serverURL: serverURL || undefined,
  });
}

export function isUnstructuredAvailable(): boolean {
  return Boolean(process.env.UNSTRUCTURED_API_KEY || process.env.UNSTRUCTURED_API_URL);
}

export async function extractPdfWithUnstructured(
  fileBuffer: Buffer,
  fileName: string = 'document.pdf',
): Promise<UnstructuredExtractionResult> {
  const client = getClient();

  console.log(`[UNSTRUCTURED PDF EXTRACTOR] 🌐 Partitioning '${fileName}' (${fileBuffer.length} bytes) via Unstructured API (strategy: 'hi_res')...`);

  const response = await client.general.partition({
    partitionParameters: {
      files: {
        content: fileBuffer,
        fileName,
      },
      strategy: 'hi_res' as any,
      splitPdfPage: true,
    },
  });

  const elements: any[] = Array.isArray(response)
    ? response
    : (response as any)?.elements || [];

  try {
    const outputDir = path.join(process.cwd(), 'extracted_texts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const rawJson = JSON.stringify(elements, null, 2);
    const outputFilePath = path.join(outputDir, 'unstructured_response.txt');
    const rootFilePath = path.join(process.cwd(), 'unstructured_response.txt');

    fs.writeFileSync(outputFilePath, rawJson, 'utf-8');
    fs.writeFileSync(rootFilePath, rawJson, 'utf-8');
    console.log(`[UNSTRUCTURED PDF EXTRACTOR] 💾 Saved raw Unstructured response to '${outputFilePath}' and '${rootFilePath}'`);
  } catch (err) {
    console.error(`[UNSTRUCTURED PDF EXTRACTOR] ⚠️ Failed to save unstructured_response.txt:`, err);
  }

  const blocks: DocumentBlock[] = [];
  let maxPageNum = 1;

  elements.forEach((element: any, index: number) => {
    const pageNum = element.metadata?.page_number || 1;
    if (pageNum > maxPageNum) maxPageNum = pageNum;

    const typeStr = String(element.type || '').toLowerCase();
    let blockType: BlockType = BlockType.PARAGRAPH;
    let headingLevel: number | undefined = undefined;

    if (typeStr.includes('title')) {
      blockType = BlockType.HEADING;
      headingLevel = 1;
    } else if (typeStr.includes('header') || typeStr.includes('heading') || typeStr.includes('subheader')) {
      blockType = BlockType.HEADING;
      headingLevel = element.metadata?.category_depth ? Math.min(element.metadata.category_depth, 6) : 2;
    } else if (typeStr.includes('list')) {
      blockType = BlockType.LIST_ITEM;
    } else if (typeStr.includes('table')) {
      blockType = BlockType.TABLE;
    } else if (typeStr.includes('code')) {
      blockType = BlockType.CODE_BLOCK;
    } else if (typeStr.includes('quote')) {
      blockType = BlockType.QUOTE;
    } else if (typeStr.includes('slide')) {
      blockType = BlockType.SLIDE;
    }

    const content = element.text || '';
    if (!content || !content.trim()) return;

    const htmlContent = element.metadata?.text_as_html || undefined;
    const parentId = element.metadata?.parent_id || undefined;
    const languages = Array.isArray(element.metadata?.languages) ? element.metadata.languages : undefined;

    blocks.push({
      id: element.element_id || `unstructured-block-${index}`,
      type: blockType,
      content: content.trim(),
      order: index,
      page: pageNum,
      headingLevel,
      parentId,
      htmlContent,
      language: languages?.[0],
      languages,
      nativeMetadata: element.metadata || undefined,
    });
  });

  console.log(`[UNSTRUCTURED -> COMMONDOCUMENT BLOCKS] 🧩 Converted ${blocks.length} elements into DocumentBlocks.`);

  return {
    blocks,
    rawElements: elements,
    pageCount: maxPageNum,
  };
}
