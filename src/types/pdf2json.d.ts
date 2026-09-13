declare module 'pdf2json' {
  import { EventEmitter } from 'events';

  class PDFParser extends EventEmitter {
    constructor(arg1: any, arg2: boolean);
    parseBuffer(buffer: Buffer): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export default PDFParser;
}
