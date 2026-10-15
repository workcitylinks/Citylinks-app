import { manipulateAsync, SaveFormat, ImageResult } from 'expo-image-manipulator';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (0.75 is recommended for optimal speed and visual quality)
  format?: SaveFormat;
}

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
  originalUri: string;
}

/**
 * Compresses and resizes an image URI using expo-image-manipulator.
 * Reduces 5MB-15MB device camera photos down to optimized ~150KB-300KB JPEGs
 * for ultra-fast uploads, minimal memory consumption, and lower server storage costs.
 */
export async function compressImage(
  uri: string,
  options: CompressOptions = {}
): Promise<CompressedImageResult> {
  if (!uri || typeof uri !== 'string') {
    return { uri: '', width: 0, height: 0, originalUri: uri || '' };
  }

  // Skip remote web URLs or data URIs that cannot/should not be manipulated locally
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return { uri, width: 0, height: 0, originalUri: uri };
  }

  const {
    maxWidth = 1280,
    maxHeight,
    quality = 0.75,
    format = SaveFormat.JPEG,
  } = options;

  try {
    const actions: any[] = [];

    if (maxWidth && maxHeight) {
      actions.push({ resize: { width: maxWidth, height: maxHeight } });
    } else if (maxWidth) {
      actions.push({ resize: { width: maxWidth } });
    } else if (maxHeight) {
      actions.push({ resize: { height: maxHeight } });
    }

    const result: ImageResult = await manipulateAsync(uri, actions, {
      compress: Math.max(0.1, Math.min(1, quality)),
      format,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      originalUri: uri,
    };
  } catch (error) {
    console.warn('[imageCompressor] Compression skipped or failed, using original URI:', error);
    return {
      uri,
      width: 0,
      height: 0,
      originalUri: uri,
    };
  }
}

/**
 * Avatar preset: max 512x512, high quality
 */
export async function compressAvatar(uri: string): Promise<string> {
  const res = await compressImage(uri, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.8,
    format: SaveFormat.JPEG,
  });
  return res.uri;
}

/**
 * Deal or Marketplace Banner preset: 16:9 ratio, max width 1280, 0.75 quality
 */
export async function compressBanner(uri: string): Promise<string> {
  const res = await compressImage(uri, {
    maxWidth: 1280,
    quality: 0.75,
    format: SaveFormat.JPEG,
  });
  return res.uri;
}

/**
 * Product image preset: 1:1 ratio, max 1024x1024, 0.75 quality
 */
export async function compressProductImage(uri: string): Promise<string> {
  const res = await compressImage(uri, {
    maxWidth: 1024,
    quality: 0.75,
    format: SaveFormat.JPEG,
  });
  return res.uri;
}

/**
 * Document / Proof of ID preset: max width 1600, 0.8 quality for crisp text readability
 */
export async function compressDocument(uri: string): Promise<string> {
  const res = await compressImage(uri, {
    maxWidth: 1600,
    quality: 0.8,
    format: SaveFormat.JPEG,
  });
  return res.uri;
}
