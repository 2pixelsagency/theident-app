import type { NextConfig } from "next";

// The pre-redesign screens have been removed. Their old addresses (bookmarks, installed apps,
// old emails) forward to the new equivalents. Temporary (307) so browsers don't cache them forever.
const OLD_ROUTES: [string, string][] = [
  ["/dashboard", "/home"],
  ["/activity", "/home"],
  ["/signup", "/start"],
  ["/onboarding/:step*", "/start"],
  ["/browse", "/talent"],
  ["/saved", "/find"],
  ["/applications", "/castings"],
  ["/my-jobs", "/postings"],
  ["/my-jobs/:id", "/postings/:id"],
  ["/post-job", "/postings/new"],
  ["/calendar", "/diary"],
  ["/messages", "/chats"],
  ["/messages/:id", "/chats/:id"],
  ["/connections", "/chats"],
  ["/profile", "/me"],
  ["/profile/edit", "/me/edit"],
  ["/profile/customise", "/me/edit"],
  ["/expenses", "/tax"],
  ["/communities", "/whats-on"],
  ["/communities/:path*", "/whats-on"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_ROUTES.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
