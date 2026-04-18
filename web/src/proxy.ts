import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const SIGN_IN_URL = "/sign-in";
const SIGN_UP_URL = "/sign-up";

const isPublicRoute = createRouteMatcher([
  `${SIGN_IN_URL}(.*)`,
  `${SIGN_UP_URL}(.*)`,
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  },
  {
    signInUrl: SIGN_IN_URL,
    signUpUrl: SIGN_UP_URL,
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API rewrites
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
