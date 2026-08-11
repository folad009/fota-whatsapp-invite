import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { getConvexUrl } from "@/lib/convex-url";

const isProtectedPage = createRouteMatcher(["/dashboard(.*)"]);
const convexUrl = getConvexUrl();

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/sign-in" || path === "/sign-up";

  if (isProtectedPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/sign-in");
  }

  // Skip auth checks on sign-in/sign-up to avoid stale-cookie discovery errors.
  if (isAuthPage) {
    return undefined;
  }

  return undefined;
}, { convexUrl });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
