import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones that installed the app before the redesign still open /dashboard,
  // so forward it to the new home. Temporary (307) so browsers don't cache it forever.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: false },
      { source: "/signup", destination: "/start", permanent: false },
    ];
  },
};

export default nextConfig;
