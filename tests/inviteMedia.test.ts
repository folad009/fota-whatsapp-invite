import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAROUSEL_MAX_SLIDES,
  CAROUSEL_MIN_SLIDES,
  WHATSAPP_VIDEO_MAX_BYTES,
  WHATSAPP_VIDEO_MAX_SECONDS,
  assertEventSchedule,
  buildInviteContentVariables,
  formatWhatsAppEventDate,
  formatWhatsAppEventDateRange,
  planInviteMedia,
  resolveStoredMedia,
  validateWhatsAppVideoFile,
} from "../convex/lib/inviteMedia";

const start = Date.parse("2026-10-10T17:00:00.000Z");
const end = Date.parse("2026-10-11T21:00:00.000Z");

describe("formatWhatsAppEventDateRange", () => {
  it("keeps a single start date when there is no end", () => {
    assert.equal(
      formatWhatsAppEventDateRange(start),
      formatWhatsAppEventDate(start)
    );
  });

  it("joins start and end in Africa/Lagos with an en dash", () => {
    assert.equal(
      formatWhatsAppEventDateRange(start, end),
      `${formatWhatsAppEventDate(start)} – ${formatWhatsAppEventDate(end)}`
    );
    assert.equal(formatWhatsAppEventDate(start), "Sat, Oct 10, 6:00 PM");
    assert.equal(formatWhatsAppEventDate(end), "Sun, Oct 11, 10:00 PM");
  });
});

describe("assertEventSchedule", () => {
  it("rejects a start that is not in the future on create", () => {
    assert.throws(
      () =>
        assertEventSchedule({
          date: start,
          now: start,
          requireFutureStart: true,
        }),
      /Event date must be in the future/
    );
  });

  it("rejects an end that is not after the start", () => {
    assert.throws(
      () =>
        assertEventSchedule({
          date: end,
          endDate: start,
          now: start,
          requireFutureStart: false,
        }),
      /Event end must be after the start/
    );
  });

  it("allows a future start with a later end", () => {
    assert.doesNotThrow(() =>
      assertEventSchedule({
        date: start,
        endDate: end,
        now: start - 1,
        requireFutureStart: true,
      })
    );
  });
});

describe("resolveStoredMedia", () => {
  it("keeps a single image and clears carousel and video", () => {
    assert.deepEqual(
      resolveStoredMedia({
        mediaType: "image",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/event-banners/a.jpg",
        cloudinaryPublicId: "event-banners/a",
        carouselSlides: [
          {
            cloudinaryPublicId: "event-carousel/b",
            imageUrl: "https://example.com/b.jpg",
          },
          {
            cloudinaryPublicId: "event-carousel/c",
            imageUrl: "https://example.com/c.jpg",
          },
        ],
        videoUrl: "https://example.com/v.mp4",
        videoPublicId: "event-videos/v",
      }),
      {
        mediaType: "image",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/event-banners/a.jpg",
        cloudinaryPublicId: "event-banners/a",
      }
    );
  });

  it("requires 2 to 10 carousel slides and drops image and video fields", () => {
    assert.throws(
      () =>
        resolveStoredMedia({
          mediaType: "carousel",
          carouselSlides: [
            {
              cloudinaryPublicId: "event-carousel/a",
              imageUrl: "https://example.com/a.jpg",
            },
          ],
        }),
      new RegExp(`${CAROUSEL_MIN_SLIDES}`)
    );

    const slides = Array.from({ length: CAROUSEL_MAX_SLIDES + 1 }, (_, index) => ({
      cloudinaryPublicId: `event-carousel/${index}`,
      imageUrl: `https://example.com/${index}.jpg`,
    }));
    assert.throws(() =>
      resolveStoredMedia({ mediaType: "carousel", carouselSlides: slides })
    );

    assert.deepEqual(
      resolveStoredMedia({
        mediaType: "carousel",
        imageUrl: "https://example.com/old.jpg",
        cloudinaryPublicId: "event-banners/old",
        carouselSlides: [
          {
            cloudinaryPublicId: "event-carousel/a",
            imageUrl: "https://example.com/a.jpg",
          },
          {
            cloudinaryPublicId: "event-carousel/b",
            imageUrl: "https://example.com/b.jpg",
          },
        ],
      }),
      {
        mediaType: "carousel",
        carouselSlides: [
          {
            cloudinaryPublicId: "event-carousel/a",
            imageUrl: "https://example.com/a.jpg",
          },
          {
            cloudinaryPublicId: "event-carousel/b",
            imageUrl: "https://example.com/b.jpg",
          },
        ],
      }
    );
  });

  it("requires a video url and public id", () => {
    assert.throws(
      () => resolveStoredMedia({ mediaType: "video", videoUrl: "https://example.com/v.mp4" }),
      /video/
    );
    assert.deepEqual(
      resolveStoredMedia({
        mediaType: "video",
        imageUrl: "https://example.com/old.jpg",
        videoUrl: "https://example.com/v.mp4",
        videoPublicId: "event-videos/v.mp4",
      }),
      {
        mediaType: "video",
        videoUrl: "https://example.com/v.mp4",
        videoPublicId: "event-videos/v.mp4",
      }
    );
  });
});

describe("validateWhatsAppVideoFile", () => {
  it("accepts an mp4 within size and duration limits", () => {
    assert.equal(
      validateWhatsAppVideoFile(
        { name: "invite.mp4", type: "video/mp4", size: WHATSAPP_VIDEO_MAX_BYTES },
        WHATSAPP_VIDEO_MAX_SECONDS
      ),
      null
    );
  });

  it("rejects non-mp4, oversized, and long videos", () => {
    assert.match(
      validateWhatsAppVideoFile(
        { name: "invite.mov", type: "video/quicktime", size: 1000 },
        10
      ) ?? "",
      /MP4/
    );
    assert.match(
      validateWhatsAppVideoFile(
        { name: "invite.mp4", type: "video/mp4", size: WHATSAPP_VIDEO_MAX_BYTES + 1 },
        10
      ) ?? "",
      /16 MB/
    );
    assert.match(
      validateWhatsAppVideoFile(
        { name: "invite.mp4", type: "video/mp4", size: 1000 },
        WHATSAPP_VIDEO_MAX_SECONDS + 1
      ) ?? "",
      /60/
    );
  });
});

const text = {
  inviteeName: "Ada",
  title: "Launch",
  eventDate: "Sat, Oct 10, 6:00 PM – Sun, Oct 11, 10:00 PM",
  location: "Lagos",
  registerPath: "token123",
  description: "Join us",
};

describe("planInviteMedia", () => {
  it("uses the image template variable for a legacy single banner", () => {
    const plan = planInviteMedia(
      {
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/event-banners/abc.jpg",
        cloudinaryPublicId: "event-banners/abc.jpg",
      },
      {}
    );
    assert.equal(plan.channel, "image");
    if (plan.channel !== "image") return;
    assert.equal(plan.mediaVariable, "event-banners/abc");
    assert.equal(buildInviteContentVariables(plan, text)["4"], text.eventDate);
    assert.equal(buildInviteContentVariables(plan, text)["1"], "event-banners/abc");
  });

  it("sends a carousel only when the approved card count matches", () => {
    const slides = [
      {
        cloudinaryPublicId: "event-carousel/one.jpg",
        imageUrl: "https://example.com/one.jpg",
      },
      {
        cloudinaryPublicId: "event-carousel/two.png",
        imageUrl: "https://example.com/two.png",
      },
    ];
    const matched = planInviteMedia(
      { mediaType: "carousel", carouselSlides: slides },
      { carouselTemplateSid: "HX123", carouselCardCount: 2 }
    );
    assert.equal(matched.channel, "carousel");
    if (matched.channel !== "carousel") return;
    const variables = buildInviteContentVariables(matched, text);
    assert.equal(variables["1"], "event-carousel/one");
    assert.equal(variables["2"], "event-carousel/two");
    assert.equal(variables["5"], text.eventDate);

    const mismatch = planInviteMedia(
      { mediaType: "carousel", carouselSlides: slides },
      { carouselTemplateSid: "HX123", carouselCardCount: 3 }
    );
    assert.equal(mismatch.channel, "error");
  });

  it("falls back to the first carousel slide when no carousel template is configured", () => {
    const plan = planInviteMedia(
      {
        mediaType: "carousel",
        carouselSlides: [
          {
            cloudinaryPublicId: "event-carousel/one",
            imageUrl: "https://example.com/one.jpg",
          },
          {
            cloudinaryPublicId: "event-carousel/two",
            imageUrl: "https://example.com/two.jpg",
          },
        ],
      },
      {}
    );
    assert.equal(plan.channel, "image");
    if (plan.channel !== "image") return;
    assert.equal(plan.mediaVariable, "event-carousel/one");
  });

  it("sends video without a jpg suffix and refuses the image template", () => {
    const missing = planInviteMedia(
      {
        mediaType: "video",
        videoPublicId: "event-videos/clip.mp4",
        videoUrl: "https://example.com/clip.mp4",
        imageUrl: "https://example.com/poster.jpg",
        cloudinaryPublicId: "event-banners/poster",
      },
      {}
    );
    assert.equal(missing.channel, "error");
    if (missing.channel === "error") {
      assert.match(missing.message, /TWILIO_CONTENT_EVENT_INVITE_VIDEO/);
    }

    const ready = planInviteMedia(
      {
        mediaType: "video",
        videoPublicId: "event-videos/clip.mp4",
        videoUrl: "https://example.com/clip.mp4",
      },
      { videoTemplateSid: "HXVIDEO" }
    );
    assert.equal(ready.channel, "video");
    if (ready.channel !== "video") return;
    assert.equal(ready.mediaVariable, "event-videos/clip");
    assert.equal(ready.mediaVariable.endsWith(".jpg"), false);
    assert.equal(buildInviteContentVariables(ready, text)["1"], "event-videos/clip");
    assert.equal(buildInviteContentVariables(ready, text)["4"], text.eventDate);
  });
});
