import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Fetching data from database...");

    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
    });

    const images = await prisma.image.findMany({
      orderBy: { createdAt: "desc" },
    });

    const files = await prisma.file.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log("📊 Database results:");
    console.log("Videos found:", videos.length);
    console.log("Videos data:", videos);
    console.log("Images found:", images.length);
    console.log("Images data:", images);
    console.log("Files found:", files.length);
    console.log("Files data:", files);

    // Combine all files into a single array and add type field
    const allFiles = [
      ...videos.map((video: any) => ({ ...video, type: 'video' })),
      ...images.map((image: any) => ({ ...image, type: 'image' })),
      ...files.map((file: any) => ({ ...file, type: 'file' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log("📦 Combined files total:", allFiles.length);
    console.log("🏷️ File types distribution:", {
      videos: allFiles.filter(f => f.type === 'video').length,
      images: allFiles.filter(f => f.type === 'image').length,
      files: allFiles.filter(f => f.type === 'file').length
    });

    return NextResponse.json(allFiles, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ Error fetching all data:", error);
    return NextResponse.json(
      { error: "Error fetching all data." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
