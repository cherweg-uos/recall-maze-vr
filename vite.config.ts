// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The dev-only TanStack devtools plugin injects `data-tsd-source` on every JSX
 * element. react-three-fiber throws on unknown props for three.js objects
 * ("Cannot set data-tsd-source"), so strip it from our 3D component files.
 */
function stripDevtoolsSourceInR3F(): Plugin {
  const isR3F = (id: string) => /src[\\/]components[\\/]maze[\\/].*\.tsx(\?|$)/.test(id);
  return {
    name: "strip-tsd-source-in-r3f",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (!isR3F(id) || !code.includes("data-tsd-source")) return null;
      const out = code
        .replace(/\s*data-tsd-source="[^"]*"/g, "")
        .replace(/\s*"data-tsd-source":\s*"[^"]*",?/g, "");
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  vite: { plugins: [stripDevtoolsSourceInR3F()] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
