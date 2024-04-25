import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/"]);
const isAdminPage = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }
  const { userId, protect } = auth();
  protect();
  // Handle users who aren't authenticated
  if (!userId) {
    return auth().redirectToSignIn({ returnBackUrl: req.url });
  }
  // Protect admin route
  if (
    isAdminPage(req) &&
    !(await clerkClient.users.getUser(userId)).publicMetadata.isAdmin
  ) {
    return NextResponse.json(
      { error: "User is not an admin" },
      { status: 401 },
    );
  }
  // Allow everything else through
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/"],
};
