import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { getConvexUrl } from "@/lib/convex-url";

const isProtectedPage = createRouteMatcher(["/dashboard(.*)"]);
const convexUrl = getConvexUrl();

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/sign-in");
  }

  if (
    (request.nextUrl.pathname === "/sign-in" ||
      request.nextUrl.pathname === "/sign-up") &&
    (await convexAuth.isAuthenticated())
  ) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  return undefined;
}, { convexUrl });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
