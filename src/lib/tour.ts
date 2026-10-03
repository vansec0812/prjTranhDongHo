import { z } from "zod";
import rawTour from "../../public/tour/tour.json";
const translated = z.object({ vi: z.string().min(1), en: z.string().min(1) });
const assetPath = z
  .string()
  .regex(/^\/(tour|images)\/[a-z0-9/-]+\.(jpg|webp|mp3)$/);
const image = z.object({
  src: assetPath,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
});
const angle = z.number().min(-180).max(180);
const hotspot = z.object({
  id: z.string().min(1),
  yaw: angle,
  pitch: z.number().min(-90).max(90),
  title: translated,
  description: translated,
  image: assetPath,
  paintingSlug: z.string().regex(/^[a-z0-9-]+$/),
});
const scene = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: translated,
  description: translated,
  photo: assetPath,
  panorama: z.object({
    large: image,
    mobile: image,
    preview: image,
    thumb: image,
  }),
  horizontalFov: z.number().min(120).max(360),
  defaultYaw: angle,
  defaultPitch: z.number().min(-60).max(60),
  defaultZoom: z.number().min(0).max(100),
  narration: z.object({ vi: assetPath.nullable(), en: assetPath.nullable() }),
  links: z.array(
    z.object({
      target: z.string(),
      name: translated,
      yaw: angle,
      pitch: z.number().min(-60).max(60),
    }),
  ),
  hotspots: z.array(hotspot),
});
const schema = z
  .object({
    version: z.literal(1),
    title: translated,
    intro: translated,
    start: z.string(),
    backgroundAudio: assetPath.nullable(),
    scenes: z.array(scene).min(1).max(10),
  })
  .superRefine((data, ctx) => {
    const ids = new Set(data.scenes.map((s) => s.id));
    if (ids.size !== data.scenes.length || !ids.has(data.start))
      ctx.addIssue({
        code: "custom",
        message: "Tour IDs/start must be unique and valid",
      });
    for (const s of data.scenes) {
      if (
        s.panorama.large.width > 8192 ||
        s.panorama.large.bytes > 6 * 1024 * 1024 ||
        s.panorama.mobile.width > 4096 ||
        s.panorama.mobile.bytes > 2 * 1024 * 1024 ||
        s.panorama.preview.bytes > 60 * 1024 ||
        s.panorama.thumb.bytes > 30 * 1024
      )
        ctx.addIssue({
          code: "custom",
          message: `Asset budget exceeded: ${s.id}`,
        });
      for (const link of s.links)
        if (
          !ids.has(link.target) ||
          !data.scenes
            .find((t) => t.id === link.target)
            ?.links.some((t) => t.target === s.id)
        )
          ctx.addIssue({
            code: "custom",
            message: `A navigation link lacks its return route: ${s.id}`,
          });
    }
  });
export const tour = schema.parse(rawTour);
export type Tour = z.infer<typeof schema>;
export type TourScene = z.infer<typeof scene>;
export type TourHotspot = z.infer<typeof hotspot>;
export function tourScene(id: string | undefined) {
  return (
    tour.scenes.find((s) => s.id === id) ??
    tour.scenes.find((s) => s.id === tour.start) ??
    tour.scenes[0]
  );
}
