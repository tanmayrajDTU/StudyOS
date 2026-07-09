import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/pyqs/**/*': ['./public/pyq-dataset/**/*'],
    '/pyqs': ['./public/pyq-dataset/**/*'],
    '/subjects/**/*': ['./public/pyq-dataset/**/*'],
    '/api/**/*': ['./public/pyq-dataset/**/*']
  }
};

export default nextConfig;
