import express, { Request, Response } from 'express';
import multer from 'multer';
import { deleteCloudflareImage, extractCloudflareImageId } from '../utils/cloudflareImages';

const router = express.Router();

// Store files in memory buffer to stream directly to Cloudflare Images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed.'));
    }
  },
});

/**
 * Upload an image to Cloudflare Images.
 * Accepts:
 * - multipart/form-data with field name 'image' or 'file'
 * - application/json with { image: 'data:image/...;base64,...' }
 * Returns: { success: true, url: 'https://imagedelivery.net/.../public', id: '...' }
 */
router.post('/', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH;

    if (!accountId || !apiToken) {
      res.status(500).json({
        error: 'Cloudflare credentials not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env',
      });
      return;
    }

    let fileBuffer: Buffer | null = null;
    let fileName = 'upload.jpg';
    let mimeType = 'image/jpeg';

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname || 'upload.jpg';
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body?.image && typeof req.body.image === 'string') {
      // Base64 fallback support
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({ error: 'No image file provided for upload.' });
      return;
    }

    // Build form data for Cloudflare Images API
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append('file', blob, fileName);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.success) {
      console.error('[Cloudflare Upload Error]:', cfData);
      const errMsg = cfData.errors?.[0]?.message || 'Failed to upload image to Cloudflare';
      res.status(502).json({ error: errMsg, details: cfData.errors });
      return;
    }

    const result = cfData.result;
    // Prefer public variant URL
    let publicUrl = '';
    if (result.variants && result.variants.length > 0) {
      // Find variant ending in 'public' or take first variant
      publicUrl = result.variants.find((v: string) => v.endsWith('/public')) || result.variants[0];
    } else if (accountHash) {
      publicUrl = `https://imagedelivery.net/${accountHash}/${result.id}/public`;
    }

    res.json({
      success: true,
      url: publicUrl,
      id: result.id,
      filename: result.filename,
    });
  } catch (error: any) {
    console.error('[Upload Exception]:', error);
    res.status(500).json({ error: error.message || 'Internal server error during image upload' });
  }
});

/**
 * DELETE /api/upload
 * Deletes an image from Cloudflare Images by URL or ID.
 * Body or query params: { url: string } or { id: string }
 */
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const target = req.body?.url || req.body?.id || req.query?.url || req.query?.id;
    if (!target || typeof target !== 'string') {
      res.status(400).json({ error: 'Please provide an image url or id to delete.' });
      return;
    }

    const imageId = extractCloudflareImageId(target);
    if (!imageId) {
      // If it is not a Cloudflare image (e.g. Unsplash or Google avatar), acknowledge without error
      res.json({ success: true, message: 'Not a Cloudflare hosted image, no remote deletion required.' });
      return;
    }

    const deleted = await deleteCloudflareImage(imageId);
    res.json({
      success: true,
      deleted,
      imageId,
      message: deleted ? 'Image deleted from Cloudflare successfully.' : 'Image already deleted or failed to delete.',
    });
  } catch (error: any) {
    console.error('[Delete Image Exception]:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image from Cloudflare' });
  }
});

export default router;
