export type EventRecord = {
  _id: string;
  _creationTime: number;
  organizerId: string;
  title: string;
  description?: string;
  date: number;
  location: string;
  cloudinaryPublicId?: string;
  imageUrl?: string;
  capacity?: number;
  registrationDeadline?: number;
  customFields?: string[];
  status: "draft" | "published" | "completed";
  createdAt: number;
  updatedAt?: number;
};

export type InviteeRecord = {
  _id: string;
  _creationTime: number;
  eventId: string;
  phone: string;
  token: string;
  inviteeName?: string;
  deliveryStatus: "pending" | "sent" | "delivered" | "failed" | "read";
  twilioMessageSid?: string;
  sentAt?: number;
  failureReason?: string;
  createdAt: number;
  rsvpStatus?: "pending" | "registered" | "declined";
  attendanceStatus?: "unknown" | "confirmed" | "declined" | "checked_in";
  registrationName?: string;
  registrationId?: string;
};
