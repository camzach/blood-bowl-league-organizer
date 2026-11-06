import { Outlet } from "react-router";
export { ErrorBoundary } from "~/app/components/route-error-boundary";

export default function AppLayout() {
  return <Outlet />;
}
