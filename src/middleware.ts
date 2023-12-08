import { authMiddleware, clerkClient } from "@clerk/nextjs";
import { NextResponse, URLPattern } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  async afterAuth(auth, req) {
    const adminPattern = new URLPattern({ pathname: "/admin" });

    if (
      !auth.userId ||
      (adminPattern.test(req.url) &&
        !(await clerkClient.users.getUser(auth.userId)).publicMetadata.isAdmin)
    ) {
      return NextResponse.json(
        { error: "User is not an admin" },
        { status: 401 },
      );
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
