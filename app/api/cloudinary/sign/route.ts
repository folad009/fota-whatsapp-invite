import { NextResponse } from "next/server";
import { getSignedUploadParams } from "@/lib/cloudinary";

export async function GET() {
  try {
    const params = getSignedUploadParams();
    return NextResponse.json(params);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
