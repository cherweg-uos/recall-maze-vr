import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const MazeGame = lazy(() => import("@/components/maze/MazeGame"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maze Recall — VR memory mazes in your browser" },
      {
        name: "description",
        content:
          "Study the route on a top-down map, then walk it from memory through endless procedurally generated VR mazes. Works in WebXR headsets or on screen.",
      },
      { property: "og:title", content: "Maze Recall — VR memory mazes in your browser" },
      {
        property: "og:description",
        content:
          "Endless procedural memory mazes for WebXR. Memorise the drawn path, then find the goal without the map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading the maze…</p>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <MazeGame />
      </Suspense>
    </ClientOnly>
  );
}
