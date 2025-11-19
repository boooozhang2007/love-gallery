import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const DB_FILE = "metadata.json";

export interface Photo {
  id: string;
  key: string;
  url: string;
  location: string;
  caption: string;
  category: "travel" | "daily";
  date: string;
}

// 获取所有照片数据
export async function getPhotos(): Promise<Photo[]> {
  try {
    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: DB_FILE });
    const response = await R2.send(command);
    const str = await response.Body?.transformToString();
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return []; // 如果文件不存在，返回空数组
  }
}

// 保存照片数据
export async function savePhotos(photos: Photo[]) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: DB_FILE,
    Body: JSON.stringify(photos),
    ContentType: "application/json",
  });
  await R2.send(command);
}

// 删除文件
export async function deleteFile(key: string) {
  await R2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}

export { R2 };