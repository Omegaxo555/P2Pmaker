import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  serverExternalPackages: ['neo4j-driver'],
};

export default nextConfig;
