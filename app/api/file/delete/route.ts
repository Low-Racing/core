import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "../../../lib/googleDrive";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "fileId obrigatório" }, { status: 400 });
    }
    const drive = await getGoogleDriveClient();
    await drive.files.delete({ fileId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
