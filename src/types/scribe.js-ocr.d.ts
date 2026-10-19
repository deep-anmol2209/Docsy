declare module 'scribe.js-ocr' {
  interface ExtractTextOptions {
    readonly ocrPages?: 'none' | 'all' | 'auto' | 'autoShallow' | 'autoDeep' | boolean[];
    readonly usePDFText?: unknown;
  }

  interface Scribe {
    extractText(
      files: { pdfFiles: ArrayBuffer[] },
      languages?: string[],
      outputFormat?: 'txt',
      options?: ExtractTextOptions,
    ): Promise<string>;
  }

  const scribe: Scribe;
  export default scribe;
}