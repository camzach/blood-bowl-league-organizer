import { isRouteErrorResponse, Link } from "react-router";

export function ErrorBoundary({ error }: { error?: unknown }) {
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const message = is404 ? "404 - Not Found" : "Something went wrong";
  const details = is404
    ? "The requested resource could not be found."
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return (
    <div className="card bg-base-200 mx-auto max-w-lg p-6 text-center shadow-lg">
      <h2 className="text-2xl font-bold">{message}</h2>
      <p className="text-base-content/80 py-4">{details}</p>
      <div className="card-actions justify-center">
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
