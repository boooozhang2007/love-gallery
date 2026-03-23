import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { R2, deleteFile, getPhotos, Photo, savePhotos } from "@/lib/r2";

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
  if (!expected || !providedPassword) return false;
  return normalizePassword(providedPassword) === normalizePassword(expected);
}

function sortPhotos(photos: Photo[]) {
  return [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const photos = await getPhotos();
  return NextResponse.json(sortPhotos(photos));
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
      return unauthorizedResponse();
    }

    const file = formData.get("file") as File | null;
    const location = readString(formData.get("location"));
    const caption = readString(formData.get("caption"));
    const category = readString(formData.get("category")) || "daily";
    const collection = readString(formData.get("collection"));

    if (!file) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 });
    }

    if (!caption || !location) {
      return NextResponse.json({ error: "描述和地点不能为空" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = `photos/${Date.now()}-${file.name}`;

    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const photos = await getPhotos();
    const newPhoto: Photo = {
      id: crypto.randomUUID(),
      key: fileKey,
      url: `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${fileKey}`,
      location,
      caption,
      category,
      ...(collection ? { collection } : {}),
      date: new Date().toISOString(),
    };

    await savePhotos(sortPhotos([...photos, newPhoto]));

    return NextResponse.json(newPhoto);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const expected = expectedAdminPassword();
    if (!expected) {
      return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD is not set" }, { status: 500 });
    }

    const headerPassword = passwordFromAuthorizationHeader(req.headers.get("authorization"));
    const body = await req.json().catch(() => null);
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const bodyPassword = record ? readString(record.password) : "";

    if (!isAuthorized(headerPassword) && !isAuthorized(bodyPassword || null)) {
      return unauthorizedResponse();
    }

    if (!record) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const id = readString(record.id);
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const photos = await getPhotos();
    const targetIndex = photos.findIndex((photo) => photo.id === id);
    if (targetIndex === -1) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const current = photos[targetIndex];
    const nextCaption = hasOwn(record, "caption") ? readString(record.caption) : current.caption;
    const nextLocation = hasOwn(record, "location") ? readString(record.location) : current.location;
    const nextCategory = hasOwn(record, "category") ? readString(record.category) : current.category;

    if (!nextCaption || !nextLocation || !nextCategory) {
      return NextResponse.json({ error: "描述、地点和分类不能为空" }, { status: 400 });
    }

    const updated: Photo = {
      ...current,
      caption: nextCaption,
      location: nextLocation,
      category: nextCategory,
    };

    if (hasOwn(record, "collection")) {
      const nextCollection = readString(record.collection);
      if (nextCollection) updated.collection = nextCollection;
      else delete updated.collection;
    }

    photos[targetIndex] = updated;
    await savePhotos(sortPhotos(photos));

    return NextResponse.json(updated);
  } catch (error: unknown) {
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
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const bodyPassword = record ? readString(record.password) : "";

    if (!isAuthorized(headerPassword) && !isAuthorized(bodyPassword || null)) {
      return unauthorizedResponse();
    }

    const id = record ? readString(record.id) : "";
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let photos = await getPhotos();
    const target = photos.find((photo) => photo.id === id);

    if (target) {
      await deleteFile(target.key);
      photos = photos.filter((photo) => photo.id !== id);
      await savePhotos(sortPhotos(photos));
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
