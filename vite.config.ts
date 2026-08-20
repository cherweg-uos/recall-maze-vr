// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The dev-only TanStack devtools source injector adds a `data-tsd-source` prop to
 * every JSX element. react-three-fiber tries to apply that prop to three.js objects
 * and throws: R3F: Cannot set "data-tsd-source".
 * Strip the injected prop from our own source files (dev only).
 */
function stripDevtoolsSourceProp(): Plugin {
  return {
    name: "strip-tsd-source-prop",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!code.includes("data-tsd-source")) return null;
      return {
        code: code.replace(/["']data-tsd-source["']\s*:\s*(["'])(?:\\.|(?!\1)[^\\])*\1\s*,?/g, ""),
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripDevtoolsSourceProp()],
  },
});
