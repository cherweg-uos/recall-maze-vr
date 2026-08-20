# Moon texture + hidden stone geometry culling

## 1. Textured moon

- Host the uploaded `moon.png` on the asset CDN (`lovable-assets create`) and import the pointer JSON — the binary never enters the repo.
- The moon sphere in `MazeGame.tsx` gets that image as its colour map instead of the flat off-white colour, still unlit (`meshBasicMaterial`, `toneMapped={false}`, `fog={false}`) so it stays crisp against the night sky.
- Rotate the sphere so the bright limb of the texture faces the same direction as the moonlight (`MOON_DIR`), keeping shadows in the scene consistent with what you see in the sky.
- Keep the soft halo shell as-is; slightly reduce its opacity so it doesn't wash the new surface detail.

## 2. Don't pay for the buried part of the stone tiles

The tiles are sunk into the ground plane, so roughly the lower part of every slab is geometry that can never be seen. Plan:

- Clip the stone material at the ground plane with a `THREE.Plane` at y = 0 (renderer `localClippingEnabled`, `clippingPlanes` on the tile material). Everything under the floor is discarded before shading — no lighting, no shadow work for those fragments.
- Also drop the tiles' shadow-receiving cost where it isn't visible by keeping `castShadow` off (already the case) and leaving `receiveShadow` only on the top-facing slabs.
- Reduce the sink depth so less geometry is buried in the first place, keeping the current visible height of the stones unchanged.

Note on expectations: clipping removes shading work but not the vertices. If tile count later becomes the bottleneck, the next step would be baking the tile top surfaces into fewer, larger merged pieces — that is a bigger change and not part of this step.

## Technical notes

- `src/assets/moon.png.asset.json` new pointer; `Moon()` in `src/components/maze/MazeGame.tsx` uses `useTexture(moonAsset.url)` with `colorSpace = SRGBColorSpace`, plus a `rotation` on the sphere aligning the lit hemisphere with `MOON_DIR`.
- `src/components/maze/vr/StoneFloor.tsx`: clone the GLTF material per part, set `clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]`, `clipShadows: true`; enable `gl.localClippingEnabled` via the `<Canvas>` `gl` prop in `MazeGame.tsx`.
- `SINK` adjusted together with the clip plane height so the visible stone profile matches today's look.
