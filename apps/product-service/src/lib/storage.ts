// =============================================================================
// Storage helpers — S3-compatible object storage via @aws-sdk/client-s3
// Works with AWS S3, MinIO, Cloudflare R2, and any S3-compatible provider
// =============================================================================

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { ServiceUnavailableError } from "@repo/common/errors";
import { env, s3Client } from "@/config";

const BUCKET = env.S3_BUCKET ?? "product-images";
const PUBLIC_URL = env.S3_PUBLIC_URL;

// ── Allowed MIME types ────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Key builders ──────────────────────────────────────────────────────────────

export function buildObjectKey(
  productId: string,
  filename: string,
  folder = "products"
): string {
  const ext = filename.split(".").pop() ?? "jpg";
  return `${folder}/${productId}/${randomUUID()}.${ext}`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a file buffer directly to S3.
 * Returns the public URL of the uploaded object.
 */
export async function uploadImage(
  productId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (!s3Client) {
    throw new ServiceUnavailableError("Storage service is not configured");
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF`);
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File too large: max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const key = buildObjectKey(productId, filename);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.byteLength,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: buildPublicUrl(key),
  };
}

/**
 * Generate a pre-signed URL for direct browser-to-S3 uploads.
 * Use this for large files to avoid routing through the service.
 *
 * Workflow:
 *   1. Client calls POST /products/:id/images/presign
 *   2. Service returns { uploadUrl, key }
 *   3. Client PUTs file directly to uploadUrl
 *   4. Client calls POST /products/:id/images with { key, altText, isPrimary }
 */
export async function getPresignedUploadUrl(
  productId: string,
  filename: string,
  mimeType: string,
  expiresIn = 300 // 5 minutes
): Promise<{ uploadUrl: string; key: string }> {
  if (!s3Client) {
    throw new ServiceUnavailableError("Storage service is not configured");
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const key = buildObjectKey(productId, filename);

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
    }),
    { expiresIn }
  );

  return { uploadUrl, key };
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete an object from S3 by its key.
 * Silent no-op if S3 is not configured.
 */
export async function deleteImage(key: string): Promise<void> {
  if (!s3Client) return;

  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    );
  } catch (err) {
    console.warn("[Storage] Failed to delete object:", key, err);
  }
}

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Build the public URL from an S3 key.
 * Uses S3_PUBLIC_URL (CDN/bucket URL) if configured, otherwise falls back
 * to the S3 endpoint URL format.
 */
export function buildPublicUrl(key: string): string {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }

  // Fallback: construct from endpoint + bucket + key
  const endpoint = env.S3_ENDPOINT ?? `https://s3.${env.S3_REGION}.amazonaws.com`;
  return `${endpoint.replace(/\/$/, "")}/${BUCKET}/${key}`;
}

/**
 * Extract the S3 key from a full public URL.
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const base = PUBLIC_URL ?? "";
    if (base && url.startsWith(base)) {
      return url.slice(base.length).replace(/^\//, "");
    }
    const urlObj = new URL(url);
    // Path format: /<bucket>/<key> or just /<key>
    const parts = urlObj.pathname.replace(/^\//, "").split("/");
    if (parts[0] === BUCKET) return parts.slice(1).join("/");
    return parts.join("/");
  } catch {
    return null;
  }
}

