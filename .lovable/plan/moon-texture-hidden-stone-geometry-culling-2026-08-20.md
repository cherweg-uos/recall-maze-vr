# Moon texture + hidden stone geometry culling

## 1. Textured moon

- Host the uploaded `full_moon.png` on the asset CDN (`lovable-assets create`) and import the pointer JSON — the binary never enters the repo.
- The moon sphere in `MazeGame.tsx` gets that image as its colour map instead of the flat off-white colour, still unlit (`meshBasicMaterial`, `toneMapped={false}`, `fog={false}`) so it stays crisp against the night sky.
- Because it is a fully lit full moon, no rotation trickery is needed — the disc reads correctly from any angle.
- Keep the soft halo shell as-is; slightly reduce its opacity so it doesn't wash the new surface detail.

## 2. Don't pay for the buried part of the stone tiles

The tiles are sunk into the ground plane, so roughly the lower part of every slab is geometry that can never be seen. Plan:

- Clip the stone material at the ground plane with a `THREE.Plane` at y = 0 (renderer `localClippingEnabled`, `clippingPlanes` on the tile material). Everything under the floor is discarded before shading — no lighting, no shadow work for those fragments.
- Tiles stop casting shadows entirely (they only ever cast onto themselves and the ground right under them), but keep receiving shadows so the wall shadows still fall across the stone surface as they do now.
- Reduce the sink depth so less geometry is buried in the first place, keeping the current visible height of the stones unchanged.

Note on expectations: clipping removes shading work but not the vertices. If tile count later becomes the bottleneck, the next step would be baking the tile top surfaces into fewer, larger merged pieces — that is a bigger change and not part of this step.

## Technical notes

- `src/assets/full_moon.png.asset.json` new pointer; `Moon()` in `src/components/maze/MazeGame.tsx` uses `useTexture(moonAsset.url)` with `colorSpace = SRGBColorSpace` on a plain unrotated sphere.
- `src/components/maze/vr/StoneFloor.tsx`: `castShadow={false}`, `receiveShadow` stays true on both instanced batches; clone the GLTF material per part and set `clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]`; enable `gl.localClippingEnabled` via the `<Canvas>` `gl` prop in `MazeGame.tsx`.
- `SINK` adjusted together with the clip plane height so the visible stone profile matches today's look.
