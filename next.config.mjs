/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The social-post routes read the official logo and the design reference images from disk;
  // include them in the serverless bundles on Vercel.
  outputFileTracingIncludes: {
    "/api/generate-design": ["./public/brand/**", "./public/house/**", "./public/styles/**"],
    "/api/refine": ["./public/brand/**"],
    "/api/finish": ["./public/brand/**"],
    "/api/prompt": ["./public/brand/**"],
    // general flyers start from these designs
    "/api/general": ["./public/general/*.html"],
    "/api/general/[id]": ["./public/general/*.html"],
  },
};
export default nextConfig;
