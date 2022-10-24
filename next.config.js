const { default: withRoutes } = await import("nextjs-routes/config")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withRoutes()(nextConfig);