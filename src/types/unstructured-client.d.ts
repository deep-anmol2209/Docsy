declare module 'unstructured-client' {
  export interface UnstructuredClientOptions {
    security: {
      apiKeyAuth: string;
    };
    serverURL?: string;
  }

  export interface PartitionParameters {
    files: {
      content: Buffer;
      fileName: string;
    };
    strategy: string;
    splitPdfPage: boolean;
  }

  export class UnstructuredClient {
    constructor(options: UnstructuredClientOptions);
    general: {
      partition(params: { partitionParameters: PartitionParameters }): Promise<any>;
    };
  }
}
