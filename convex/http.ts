import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleWebhook } from "./whatsappWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/twilio/webhook",
  method: "POST",
  handler: handleWebhook,
});

export default http;
