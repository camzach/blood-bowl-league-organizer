import { authMiddleware, clerkClient, redirectToSignIn } from "@clerk/nextjs";
import { NextResponse, URLPattern } from "next/server";

export default authMiddleware({
  async afterAuth(auth, req) {
    // Allow access to public routes
    if (auth.isPublicRoute) {
      return NextResponse.next();
    }

    // Handle users who aren't authenticated
    if (!auth.userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // Protect admin route
    const adminPattern = new URLPattern({ pathname: "/admin" });
    if (
      adminPattern.test(req.url) &&
      !(await clerkClient.users.getUser(auth.userId)).publicMetadata.isAdmin
    ) {
      return NextResponse.json(
        { error: "User is not an admin" },
        { status: 401 },
      );
    }

    // Allow everything else through
    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/"],
};
