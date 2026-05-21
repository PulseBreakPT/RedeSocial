// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";
const isProdBuild = process.env.NODE_ENV === "production";

// ─── Frontend secret-leak guard (build-time) ────────────────────────────────
// Any REACT_APP_* env var whose NAME contains one of the patterns below is
// almost certainly a secret that must NOT be embedded in the JS bundle.
// CRA inlines every REACT_APP_* into `process.env.…` in the build output, so
// this would expose the secret to every browser. Fail the build instead.
const SECRET_NAME_PATTERNS = [
    /SECRET/i,
    /PRIVATE/i,
    /SERVICE[_-]?ROLE/i,
    /SK[_-]?LIVE/i,
    /SK[_-]?TEST/i,
    /STRIPE[_-]?SECRET/i,
    /OPENAI[_-]?KEY/i,
    /OPENAI[_-]?API[_-]?KEY/i,
    /ANTHROPIC[_-]?KEY/i,
    /ANTHROPIC[_-]?API[_-]?KEY/i,
    /GOOGLE[_-]?API[_-]?KEY/i,
    /GEMINI[_-]?KEY/i,
    /FIREBASE[_-]?ADMIN/i,
    /AWS[_-]?ACCESS[_-]?KEY/i,
    /AWS[_-]?SECRET/i,
    /MONGO[_-]?URL/i,
    /JWT[_-]?SECRET/i,
    /DATABASE[_-]?URL/i,
    /SMTP[_-]?PASS/i,
    /TWILIO[_-]?TOKEN/i,
    /SENDGRID[_-]?KEY/i,
    /WEBHOOK[_-]?SECRET/i,
];
const offenders = Object.keys(process.env)
    .filter((k) => k.startsWith("REACT_APP_"))
    .filter((k) => SECRET_NAME_PATTERNS.some((re) => re.test(k)));
if (offenders.length > 0) {
    const msg =
        "🔴 SECURITY: REACT_APP_* env vars with secret-looking names detected.\n" +
        "These will be inlined into the public JS bundle and visible to every\n" +
        "browser. Move them to backend/.env (NEVER prefixed REACT_APP_):\n" +
        offenders.map((n) => `  • ${n}`).join("\n");
    if (isProdBuild) {
        // Refuse to ship — exit the build.
        console.error("\n" + msg + "\n");
        process.exit(2);
    } else {
        console.warn("\n⚠️  " + msg + "\n  (build will still proceed in dev)\n");
    }
}

// Disable source maps in production builds (defense-in-depth: no original
// React source exposed to attackers via DevTools). Can be re-enabled per-build
// by setting GENERATE_SOURCEMAP=true explicitly.
if (isProdBuild && !process.env.GENERATE_SOURCEMAP) {
    process.env.GENERATE_SOURCEMAP = "false";
}

// Environment variable overrides
const config = {
    enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
