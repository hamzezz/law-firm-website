import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * أرشيف المستندات على Cloudflare R2.
 * واجهتها متوافقة مع S3، فنستعمل عميل AWS الرسمي مع نقطة نهاية R2.
 * المفاتيح في متغيّرات البيئة ولا تظهر في الكود إطلاقاً.
 */

export const R2_BUCKET = process.env.R2_BUCKET || 'kathiri-archive'

export function r2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  )
}

let cached: S3Client | null = null

export function r2Client(): S3Client {
  if (cached) return cached
  cached = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  return cached
}

/** رفع ملف إلى الأرشيف */
export async function r2Put(key: string, body: Uint8Array, contentType: string) {
  await r2Client().send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  }))
}

/** حجم الملف في الأرشيف — نتحقّق به قبل حذف الأصل */
export async function r2Size(key: string): Promise<number | null> {
  try {
    const res = await r2Client().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return typeof res.ContentLength === 'number' ? res.ContentLength : null
  } catch {
    return null
  }
}

/** رابط قراءة موقّت، بنفس مدّة روابط Supabase */
export async function r2SignedUrl(key: string, seconds = 3600): Promise<string | null> {
  try {
    return await getSignedUrl(
      r2Client(),
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: seconds }
    )
  } catch {
    return null
  }
}
