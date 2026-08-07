import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all local network origins for dev access (LAN testing)
  // This allows accessing the dev server from any device on the same network
  // NOTE: bare "*" wildcard is not supported — must use specific hostnames or *.domain patterns.
  // For a LAN dev server, include the machine's LAN IP here.
  allowedDevOrigins: ["192.168.1.10", "192.168.1.7", "localhost", "127.0.0.1","192.168.1.14"],

  // Enable detailed error logging in dev
  serverExternalPackages: [],

  // Disable strict Host check — needed when accessing via IP
  // skipProxyUrlNormalize: true,
};

export default nextConfig;
