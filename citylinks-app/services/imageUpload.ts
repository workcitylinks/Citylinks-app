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
