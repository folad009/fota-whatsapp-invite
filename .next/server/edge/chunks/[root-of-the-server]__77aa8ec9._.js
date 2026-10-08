(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__77aa8ec9._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/convex-url.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Convex deployment URL for client + middleware.
 * Set via NEXT_PUBLIC_CONVEX_URL, or derived at build time in next.config.ts
 * from CONVEX_DEPLOYMENT (e.g. fiery-roadrunner-823 → https://….convex.cloud).
 */ __turbopack_context__.s([
    "getConvexUrl",
    ()=>getConvexUrl
]);
function getConvexUrl() {
    const url = ("TURBOPACK compile-time value", "https://adorable-minnow-162.convex.cloud");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return url.replace(/\/$/, "");
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@convex-dev+auth@0.0.80_@auth+core@0.37.4_convex@1.46.0_react@19.3.0__react@19.3.0/node_modules/@convex-dev/auth/dist/nextjs/server/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$routeMatcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@convex-dev+auth@0.0.80_@auth+core@0.37.4_convex@1.46.0_react@19.3.0__react@19.3.0/node_modules/@convex-dev/auth/dist/nextjs/server/routeMatcher.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$convex$2d$url$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/convex-url.ts [middleware-edge] (ecmascript)");
;
;
const isProtectedPage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$routeMatcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createRouteMatcher"])([
    "/dashboard(.*)"
]);
const convexUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$convex$2d$url$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getConvexUrl"])();
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convexAuthNextjsMiddleware"])(async (request, { convexAuth })=>{
    const path = request.nextUrl.pathname;
    const isAuthPage = path === "/sign-in";
    if (isProtectedPage(request) && !await convexAuth.isAuthenticated()) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["nextjsMiddlewareRedirect"])(request, "/sign-in");
    }
    if (isAuthPage && await convexAuth.isAuthenticated()) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$80_$40$auth$2b$core$40$0$2e$37$2e$4_convex$40$1$2e$46$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["nextjsMiddlewareRedirect"])(request, "/dashboard");
    }
    return undefined;
}, {
    convexUrl
});
const config = {
    matcher: [
        "/((?!.*\\..*|_next).*)",
        "/",
        "/(api|trpc)(.*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__77aa8ec9._.js.map