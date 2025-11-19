import { NextRequest, NextResponse } from "next/server";
import { R2, getPhotos, savePhotos, deleteFile, Photo } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const photos = await getPhotos();
  // 按时间倒序排列
  return NextResponse.json(photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
}

export async function POST(req: NextRequest) {
  // 简单的密码验证
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const location = formData.get("location") as string;
  const caption = formData.get("caption") as string;
  const category = formData.get("category") as "travel" | "daily";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKey = `photos/${Date.now()}-${file.name}`;
  
  // 1. 上传图片到 R2
  await R2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type,
  }));

  // 2. 更新 metadata.json
  const photos = await getPhotos();
  const newPhoto: Photo = {
    id: crypto.randomUUID(),
    key: fileKey,
    url: `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${fileKey}`,
    location,
    caption,
    category,
    date: new Date().toISOString(),
  };
  
  photos.push(newPhoto);
  await savePhotos(photos);

  return NextResponse.json(newPhoto);
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  let photos = await getPhotos();
  const target = photos.find((p) => p.id === id);

  if (target) {
    await deleteFile(target.key); // 删除 R2 中的图片
    photos = photos.filter((p) => p.id !== id);
    await savePhotos(photos); // 更新 JSON
  }

  return NextResponse.json({ success: true });
}