import { Platform } from 'react-native';
import { apiClient } from '../api/apiClient';

/**
 * Uploads a local image file URI directly to Cloudflare Images through the backend.
 * Returns the permanent Cloudflare delivery URL (https://imagedelivery.net/...)
 * ready to be stored in PostgreSQL.
 */
export async function uploadImageToCloudflare(localUri: string): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('No image URI provided for upload.');
  }

  const cleanUri = localUri.trim();

  // If already a remote CDN / web URL (e.g. Google avatar or already hosted), return as is
  if (cleanUri.startsWith('http://') || cleanUri.startsWith('https://')) {
    return cleanUri;
  }

  const formData = new FormData();
  const fileExtension = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = fileExtension === 'png' ? 'image/png' : fileExtension === 'webp' ? 'image/webp' : 'image/jpeg';
  const fileName = `citylinks_${Date.now()}.${fileExtension}`;

  const formattedUri = Platform.OS === 'ios' ? cleanUri.replace('file://', '') : cleanUri;

  formData.append('image', {
    uri: formattedUri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000, // 30s timeout for upload
  });

  if (!response.data?.url) {
    throw new Error(response.data?.error || 'Failed to retrieve Cloudflare image URL.');
  }

  return response.data.url;
}

/**
 * Deletes an image from Cloudflare Images via the backend DELETE /upload endpoint.
 * Returns true if successful or if not a Cloudflare image.
 */
export async function deleteImageFromCloudflare(imageUrlOrId?: string | null): Promise<boolean> {
  if (!imageUrlOrId || typeof imageUrlOrId !== 'string') {
    return false;
  }

  const clean = imageUrlOrId.trim();
  if (!clean) return false;

  // Only attempt deletion if it's an imagedelivery.net URL or UUID
  if (clean.startsWith('file://') || clean.startsWith('data:') || (!clean.includes('imagedelivery.net') && clean.includes('://'))) {
    return true; // Not a Cloudflare image, nothing to delete
  }

  try {
    const res = await apiClient.delete('/upload', {
      data: { url: clean },
    });
    return Boolean(res.data?.success);
  } catch (err) {
    console.warn('[Cloudflare Delete Client Error]:', err);
    return false;
  }
}
