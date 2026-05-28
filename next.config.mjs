import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sql.js", "node:sqlite", "bun:sqlite"],
  turbopack: {
    root: projectRoot
  },
  outputFileTracingRoot: projectRoot,
  outputFileTracingExcludes: {
    "*": ["./gitbook/**/*"]
  },
  outputFileTracingIncludes: {
    "/api/router-agent/manifest": ["./src/lib/router-agent/skills/*.md"],
    "/api/router-agent/skills/[name]": ["./src/lib/router-agent/skills/*.md"]
  },
  images: {
    unoptimized: true
  },
  env: {},
  webpack: (config, { isServer }) => {
    // Ignore fs/path modules in browser bundle
    if (!isServer) {
      // Stub Node built-ins that some server-shared modules (e.g. open-sse's
      // providers.js / appConstants.js) import unconditionally for User-Agent
      // building. The functions that use them are never invoked from browser
      // code; without these stubs webpack can't statically resolve the
      // re-export chain and drops symbols like getModelsByProviderId.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    // Exclude logs, .next, gitbook subapp, and node_modules from the watcher.
    // node_modules MUST stay in this list: assigning `ignored` overwrites
    // Next.js's default (which already excludes node_modules), so omitting it
    // makes Watchpack recurse into every dependency and exhaust the inotify
    // watch limit (ENOSPC: System limit for number of file watchers reached).
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /[\\/](logs|\.next|gitbook|node_modules)[\\/]/,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/v1/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1/v1",
        destination: "/api/v1"
      },
      {
        source: "/codex/:path*",
        destination: "/api/v1/responses"
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*"
      },
      {
        source: "/v1",
        destination: "/api/v1"
      }
    ];
  }
};

export default nextConfig;
