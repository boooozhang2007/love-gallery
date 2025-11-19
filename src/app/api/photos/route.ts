import { NextRequest, NextResponse } from "next/server";
import { R2, getPhotos, savePhotos, deleteFile, Photo } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function GET() {
  const photos = await getPhotos();
  return NextResponse.json(photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
}

export async function POST(req: NextRequest) {
  try {
    // 1. 验证密码
    const auth = req.headers.get("authorization");
    // 打印日志帮助调试 (部署成功后可删除)
    console.log("Server: 收到密码验证请求");
    
    if (auth !== process.env.ADMIN_PASSWORD) {
      console.error("Server: 密码错误. 收到:", auth, "期望:", process.env.ADMIN_PASSWORD);
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const location = formData.get("location") as string;
    const caption = formData.get("caption") as string;
    const category = formData.get("category") as "travel" | "daily";

    if (!file) return NextResponse.json({ error: "未找到文件" }, { status: 400 });

    // 2. 准备上传
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = `photos/${Date.now()}-${file.name}`;

    console.log("Server: 正在连接 R2 上传图片...");

    // 3. 上传图片到 R2
    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    }));

    console.log("Server: R2 图片上传成功，正在更新数据库...");

    // 4. 更新 metadata.json
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

    console.log("Server: 全部流程完成");
    return NextResponse.json(newPhoto);

  } catch (error: any) {
    // 捕获所有服务器端错误并打印
    console.error("Server Error 详细报错:", error);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    let photos = await getPhotos();
    const target = photos.find((p) => p.id === id);

    if (target) {
      await deleteFile(target.key);
      photos = photos.filter((p) => p.id !== id);
      await savePhotos(photos);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}