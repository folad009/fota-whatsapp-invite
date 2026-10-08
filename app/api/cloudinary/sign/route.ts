import { NextResponse } from "next/server";
import { getSignedUploadParams } from "@/lib/cloudinary";

export async function GET(request: Request) {
  try {
    const kind = new URL(request.url).searchParams.get("kind");
    const params =
      kind === "video"
        ? getSignedUploadParams({
            folder: "event-videos",
            transformation: null,
            resourceType: "video",
          })
        : kind === "carousel"
          ? getSignedUploadParams({ folder: "event-carousel" })
          : getSignedUploadParams();
    return NextResponse.json(params);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
