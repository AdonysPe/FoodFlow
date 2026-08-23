/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev SQLite file lives under prisma/ inside the project tree; every
  // query touches its journal file, which webpack's watcher was picking up
  // as a source change and triggering needless full rebuilds on every DB hit.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/prisma/dev.db*"],
      };
    }
    return config;
  },
};

export default nextConfig;
