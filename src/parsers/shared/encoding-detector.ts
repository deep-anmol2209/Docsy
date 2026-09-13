/**
 * Encoding Detector
 *
 * Responsibility:
 * ----------------
 * Detect character encoding of raw input buffers/strings and decode them into UTF-8.
 */
export interface EncodingDetectionResult {
  readonly encoding: string;
  readonly confidence: number;
  readonly isUtf8Compatible: boolean;
}

export class EncodingDetector {
  /**
   * Detects character encoding from a Uint8Array or Buffer.
   */
  public detect(input: Uint8Array | Buffer): EncodingDetectionResult {
    const bytes = input instanceof Buffer ? input : Buffer.from(input);

    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return { encoding: 'utf-8-bom', confidence: 1.0, isUtf8Compatible: true };
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return { encoding: 'utf-16be', confidence: 1.0, isUtf8Compatible: false };
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return { encoding: 'utf-16le', confidence: 1.0, isUtf8Compatible: false };
    }

    let isAscii = true;
    let isValidUtf8 = true;
    let i = 0;

    while (i < bytes.length) {
      const byte = bytes[i];
      if (byte > 0x7f) {
        isAscii = false;
        // Check UTF-8 sequence validity
        if ((byte & 0xe0) === 0xc0) {
          if (i + 1 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80) {
            isValidUtf8 = false;
            break;
          }
          i += 1;
        } else if ((byte & 0xf0) === 0xe0) {
          if (
            i + 2 >= bytes.length ||
            (bytes[i + 1] & 0xc0) !== 0x80 ||
            (bytes[i + 2] & 0xc0) !== 0x80
          ) {
            isValidUtf8 = false;
            break;
          }
          i += 2;
        } else if ((byte & 0xf8) === 0xf0) {
          if (
            i + 3 >= bytes.length ||
            (bytes[i + 1] & 0xc0) !== 0x80 ||
            (bytes[i + 2] & 0xc0) !== 0x80 ||
            (bytes[i + 3] & 0xc0) !== 0x80
          ) {
            isValidUtf8 = false;
            break;
          }
          i += 3;
        } else {
          isValidUtf8 = false;
          break;
        }
      }
      i++;
    }

    if (isAscii) {
      return { encoding: 'ascii', confidence: 1.0, isUtf8Compatible: true };
    }
    if (isValidUtf8) {
      return { encoding: 'utf-8', confidence: 0.95, isUtf8Compatible: true };
    }

    return { encoding: 'iso-8859-1', confidence: 0.5, isUtf8Compatible: false };
  }

  /**
   * Converts a given raw buffer or string into a clean UTF-8 string.
   */
  public decodeToUtf8(input: Uint8Array | Buffer | string, fallbackEncoding = 'utf-8'): string {
    if (typeof input === 'string') {
      return input;
    }
    const detection = this.detect(input);
    const encodingToUse = detection.isUtf8Compatible ? 'utf-8' : detection.encoding || fallbackEncoding;
    
    try {
      const decoder = new TextDecoder(encodingToUse);
      return decoder.decode(input);
    } catch {
      // Fallback decoder
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(input);
    }
  }
}