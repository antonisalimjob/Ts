import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
    "socket.io",
    "otplib",
    "@otplib/core",
    "@otplib/totp",
    "@otplib/uri",
    "qrcode",
  ],
};

export default nextConfig;
