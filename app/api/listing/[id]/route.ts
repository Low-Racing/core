import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try to delete from each table since we don't know the type
    await Promise.allSettled([
      prisma.video.delete({ where: { id } }),
      prisma.image.delete({ where: { id } }),
      prisma.file.delete({ where: { id } })
    ]);

    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Error deleting file." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}