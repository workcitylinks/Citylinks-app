/**
 * Utility for managing and deleting images from Cloudflare Images API.
 */

/**
 * Extracts the Cloudflare Image ID from a delivery URL or raw ID.
 * Example delivery URL:
 * https://imagedelivery.net/YGxegjXjx7jKzlggEmOCvA/ccd19b26-d887-42de-7bd1-de6f5dffc000/public
 * Returns "ccd19b26-d887-42de-7bd1-de6f5dffc000" or null if not a Cloudflare image.
 */
export function extractCloudflareImageId(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern 1: Standard Cloudflare imagedelivery.net URL
  const deliveryMatch = trimmed.match(/imagedelivery\.net\/[^/]+\/([^/?#]+)/i);
  if (deliveryMatch && deliveryMatch[1]) {
    return deliveryMatch[1];
  }

  // Pattern 2: Cloudflare API endpoint format if stored
  const apiMatch = trimmed.match(/api\.cloudflare\.com\/.*?\/images\/v1\/([^/?#]+)/i);
  if (apiMatch && apiMatch[1]) {
    return apiMatch[1];
  }

  // Pattern 3: Raw UUID / Cloudflare Image ID directly (non-URL string with alphanumeric + hyphens/underscores)
  if (!trimmed.includes('/') && !trimmed.startsWith('http') && /^[a-zA-Z0-9_-]{12,64}$/.test(trimmed)) {
    return trimmed;
  }

  // Non-Cloudflare image (e.g. Google avatar, Unsplash, local asset)
  return null;
}

/**
 * Deletes an image from Cloudflare Images using its URL or ID.
 * Returns true if deleted or already non-existent, false if skipped or failed.
 * Safe to call: will not throw an error, preventing database transactions from aborting.
 */
export async function deleteCloudflareImage(imageUrlOrId: string | null | undefined): Promise<boolean> {
  const imageId = extractCloudflareImageId(imageUrlOrId);
  if (!imageId) {
    // Not a Cloudflare image (e.g. External URL or null) - safely ignore
    return false;
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.warn('[Cloudflare Delete] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in environment.');
    return false;
  }

  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const data: any = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      console.log(`[Cloudflare Delete] Successfully deleted image ${imageId} from Cloudflare.`);
      return true;
    }

    // Code 5404 or 7000 means "Image not found", so it's already deleted/gone
    if (data.errors && Array.isArray(data.errors)) {
      const isAlreadyGone = data.errors.some((err: any) => err.code === 5404 || err.code === 7000 || /not found/i.test(err.message || ''));
      if (isAlreadyGone) {
        console.log(`[Cloudflare Delete] Image ${imageId} was already deleted or not found.`);
        return true;
      }
    }

    console.warn(`[Cloudflare Delete Warning] Failed to delete image ${imageId}:`, data.errors || response.statusText);
    return false;
  } catch (err: any) {
    console.error(`[Cloudflare Delete Exception] Error deleting image ${imageId}:`, err.message || err);
    return false;
  }
}

/**
 * Deletes multiple Cloudflare images in parallel.
 */
export async function deleteMultipleCloudflareImages(urlsOrIds: (string | null | undefined)[]): Promise<void> {
  if (!urlsOrIds || urlsOrIds.length === 0) return;

  const validIds = Array.from(
    new Set(
      urlsOrIds
        .map((u) => extractCloudflareImageId(u))
        .filter((id): id is string => Boolean(id))
    )
  );

  if (validIds.length === 0) return;

  await Promise.allSettled(validIds.map((id) => deleteCloudflareImage(id)));
}

/**
 * If an entity's image was updated/replaced, deletes the old image from Cloudflare
 * if it differs from the new image.
 */
export async function handleImageReplacement(
  oldImageUrl: string | null | undefined,
  newImageUrl: string | null | undefined
): Promise<void> {
  if (!oldImageUrl) return;

  const oldId = extractCloudflareImageId(oldImageUrl);
  const newId = extractCloudflareImageId(newImageUrl);

  // If old image was in Cloudflare and is different from new image, delete old image
  if (oldId && oldId !== newId) {
    console.log(`[Cloudflare Replacement] Old image ${oldId} replaced by ${newId || 'none'}. Deleting old image...`);
    await deleteCloudflareImage(oldId);
  }
}
