import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Développement : autorise l'ouverture du site depuis le réseau local (téléphone…) et admin.localhost
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.20.10.*", "*.localhost"],
  images: {
    qualities: [75, 90],
    // Images déposées depuis l'admin (Supabase Storage)
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // En-têtes de sécurité du navigateur, sur le site comme sur l'admin
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
