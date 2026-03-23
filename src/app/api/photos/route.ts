import { NextRequest, NextResponse } from "next/server";
import { R2, getPhotos, savePhotos, deleteFile, Photo } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

function normalizePassword(value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function expectedAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function passwordFromAuthorizationHeader(headerValue: string | null) {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) return trimmed.slice(7).trim();
  return trimmed;
}

function isAuthorized(providedPassword: string | null) {
  const expected = expectedAdminPassword();
  if (!expected) return false;
  if (!providedPassword) return false;
  return normalizePassword(providedPassword) === normalizePassword(expected);
}

export async function GET() {
  const photos = await getPhotos();
  return NextResponse.json(photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
}

export async function POST(req: NextRequest) {
  try {
    const expected = expectedAdminPassword();
    if (!expected) {
      return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD is not set" }, { status: 500 });
    }

    const headerPassword = passwordFromAuthorizationHeader(req.headers.get("authorization"));
    const formData = await req.formData();

    const bodyPassword = formData.get("password") ?? formData.get("adminPassword") ?? formData.get("auth");
    const providedBodyPassword = typeof bodyPassword === "string" ? bodyPassword : null;

    if (!isAuthorized(headerPassword) && !isAuthorized(providedBodyPassword)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

  } catch (error: unknown) {
    // 捕获所有服务器端错误并打印
    console.error("Server Error 详细报错:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const expected = expectedAdminPassword();
    if (!expected) {
      return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD is not set" }, { status: 500 });
    }

    const headerPassword = passwordFromAuthorizationHeader(req.headers.get("authorization"));
    const body = await req.json().catch(() => null);
    const bodyPassword = body && typeof body.password === "string" ? body.password : null;

    if (!isAuthorized(headerPassword) && !isAuthorized(bodyPassword)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = body && typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let photos = await getPhotos();
    const target = photos.find((p) => p.id === id);

    if (target) {
      await deleteFile(target.key);
      photos = photos.filter((p) => p.id !== id);
      await savePhotos(photos);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "服务器内部错误" }, { status: 500 });
  }
}
