"""Product media storage (local + S3) setup.

## Architecture

```text
POST /api/v1/products/{id}/media  (multipart)
        ↓
Validate + Pillow process (large / medium / thumbnail WebP)
        ↓
StorageProvider (local | s3)
        ↓
product_media row (storage keys + metadata)
```

Endpoints are unchanged. Frontend keeps create-product-then-upload flow.

## Environment

### Local development

```env
STORAGE_PROVIDER=local
LOCAL_UPLOAD_ROOT=uploads
MAX_IMAGE_UPLOAD_SIZE_MB=10
```

Files land under `uploads/products/{product_id}/{media_id}/`.

Serve via existing StaticFiles mount at `/uploads`.

### Production (S3)

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-bucket
AWS_S3_PUBLIC_BASE_URL=          # optional custom base
AWS_CLOUDFRONT_DOMAIN=           # optional CDN host, preferred when set
MAX_IMAGE_UPLOAD_SIZE_MB=10
```

Never put AWS secrets in `NEXT_PUBLIC_*` variables.

## S3 object layout

```text
temp/product-media/{upload_id}/original
products/{product_id}/{media_id}/large.webp
products/{product_id}/{media_id}/medium.webp
products/{product_id}/{media_id}/thumbnail.webp
```

## IAM (least privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProductMediaObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET/products/*",
        "arn:aws:s3:::YOUR_BUCKET/temp/product-media/*"
      ]
    },
    {
      "Sid": "ListBucketPrefixes",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["products/*", "temp/product-media/*"]
        }
      }
    }
  ]
}
```

Do not grant `AdministratorAccess` to the app role.

## Bucket notes

- Block public write; app credentials perform uploads.
- Public read can be bucket policy on `products/*`, or CloudFront OAC.
- Set `AWS_CLOUDFRONT_DOMAIN` when CDN is ready — DB keys stay the same.

## Migration

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

Revision `20260726_0014` adds variant/metadata columns to `product_media`.
Legacy rows with only `url` (`/uploads/products/...`) keep working.

## Local verification checklist

1. `STORAGE_PROVIDER=local`
2. Create product → upload JPEG/PNG/WebP
3. Confirm three WebP files under `uploads/products/...`
4. API media includes `large_url`, `medium_url`, `thumbnail_url`
5. Delete media removes files and DB row
6. Reorder + set primary still work

## S3 verification checklist

1. Configure AWS env vars and `STORAGE_PROVIDER=s3`
2. Upload image; confirm objects in bucket
3. Confirm temp original is removed after success
4. Response URLs use S3 or CloudFront base
5. Delete media removes all three WebP objects
