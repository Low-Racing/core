import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/googleDrive";

export async function PATCH(req: NextRequest) {
  try {
    const { fileId, newTitle } = await req.json();
    if (!fileId || !newTitle) {
      return NextResponse.json({ error: "fileId e newTitle obrigatórios" }, { status: 400 });
    }
    const drive = await getGoogleDriveClient();
    await drive.files.update({ fileId, requestBody: { name: newTitle } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
