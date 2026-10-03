"use client";
import { useEffect, useRef } from "react";
import { Viewer, events, type PanoData } from "@photo-sphere-viewer/core";
import {
  MarkersPlugin,
  type MarkerConfig,
} from "@photo-sphere-viewer/markers-plugin";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import { VisibleRangePlugin } from "@photo-sphere-viewer/visible-range-plugin";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import type { TourScene, TourHotspot } from "@/lib/tour";
import type { Locale } from "@/lib/links";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

export type TourControls = {
  zoom: (delta: number) => void;
  rotate: (yaw: number, pitch: number) => void;
  autorotate: (enabled: boolean) => void;
  gyroscope: () => Promise<boolean>;
  reset: () => void;
  isRotating: () => boolean;
};
type Props = {
  scene: TourScene;
  locale: Locale;
  onReady: (controls: TourControls | null) => void;
  onState: (state: "loading" | "ready" | "error") => void;
  goTo: (id: string) => void;
  onHotspot: (hotspot: TourHotspot) => void;
  onPick?: (position: { yaw: number; pitch: number }) => void;
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;
function croppedData(
  scene: TourScene,
  width: number,
  height: number,
): PanoData {
  const fullWidth = Math.round((width * 360) / scene.horizontalFov);
  const fullHeight = Math.round(fullWidth / 2);
  return {
    fullWidth,
    fullHeight,
    croppedWidth: width,
    croppedHeight: height,
    croppedX: Math.round((fullWidth - width) / 2),
    croppedY: Math.round((fullHeight - height) / 2),
  };
}
export function TourViewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const current = useRef(props);
  current.current = props;
  const generation = useRef(0);
  const interacted = useRef(false);
  useEffect(() => {
    const lifecycle = generation;
    if (!host.current) return;
    try {
      const v = new Viewer({
        container: host.current,
        navbar: false,
        keyboard: false,
        minFov: 30,
        maxFov: 70,
        mousewheel: true,
        touchmoveTwoFingers: false,
        loadingTxt:
          props.locale === "en" ? "Loading the view…" : "Đang mở góc nhìn…",
        plugins: [
          [MarkersPlugin, { markers: [] }],
          [
            AutorotatePlugin,
            {
              autostartDelay: null,
              autostartOnIdle: false,
              autorotateSpeed: "0.5rpm",
            },
          ],
          [VisibleRangePlugin, { usePanoData: true }],
          [GyroscopePlugin, { touchmove: true }],
        ],
      });
      viewer.current = v;
      const stop = () => {
        interacted.current = true;
        v.getPlugin<AutorotatePlugin>(AutorotatePlugin).stop();
      };
      const element = host.current;
      element.addEventListener("pointerdown", stop);
      element.addEventListener("wheel", stop, { passive: true });
      v.addEventListener(events.ClickEvent.type, (event) => {
        const pick = current.current.onPick;
        if (pick)
          pick({
            yaw: (event.data.yaw * 180) / Math.PI,
            pitch: (event.data.pitch * 180) / Math.PI,
          });
      });
      current.current.onReady({
        zoom(delta) {
          stop();
          v.zoom(Math.max(0, Math.min(100, v.getZoomLevel() + delta)));
        },
        rotate(yaw, pitch) {
          stop();
          const p = v.getPosition();
          v.rotate({ yaw: p.yaw + yaw, pitch: p.pitch + pitch });
        },
        autorotate(enabled) {
          interacted.current = true;
          const auto = v.getPlugin<AutorotatePlugin>(AutorotatePlugin);
          if (enabled) auto.start();
          else auto.stop();
        },
        isRotating() {
          return v.getPlugin<AutorotatePlugin>(AutorotatePlugin).isEnabled();
        },
        async gyroscope() {
          stop();
          const gyro = v.getPlugin<GyroscopePlugin>(GyroscopePlugin);
          if (gyro.isEnabled()) {
            gyro.stop();
            return false;
          }
          await gyro.start();
          return true;
        },
        reset() {
          stop();
          const s = current.current.scene;
          v.rotate({
            yaw: radians(s.defaultYaw),
            pitch: radians(s.defaultPitch),
          });
          v.zoom(s.defaultZoom);
        },
      });
      return () => {
        lifecycle.current++;
        element.removeEventListener("pointerdown", stop);
        element.removeEventListener("wheel", stop);
        current.current.onReady(null);
        v.destroy();
        viewer.current = null;
      };
    } catch {
      current.current.onState("error");
    }
    // The viewer is owned by this mounted component; subsequent scene changes use setPanorama.
  }, [props.locale]);
  useEffect(() => {
    const lifecycle = generation;
    const v = viewer.current;
    if (!v) return;
    const token = ++generation.current;
    const s = props.scene;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    current.current.onState("loading");
    v.getPlugin<AutorotatePlugin>(AutorotatePlugin).stop();
    const markers = v.getPlugin<MarkersPlugin>(MarkersPlugin);
    markers.clearMarkers();
    const mobile = window.innerWidth <= 768;
    const image = mobile ? s.panorama.mobile : s.panorama.large;
    const maxFov = Math.min(
      100,
      (image.height / image.width) * s.horizontalFov * 0.85,
    );
    v.setOptions({ maxFov });
    const marker = (
      id: string,
      yaw: number,
      pitch: number,
      label: string,
      info: boolean,
      action: () => void,
    ): MarkerConfig => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = info
        ? "tour-marker tour-marker-info"
        : "tour-marker tour-marker-link";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = info
        ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 10v7m0-11v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="m5 14 7-7 7 7M12 7v12" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
      button.addEventListener("click", action);
      return {
        id,
        element: button,
        position: { yaw: radians(yaw), pitch: radians(pitch) },
        anchor: "center center",
        tooltip: label,
      };
    };
    async function load() {
      try {
        await v?.setPanorama(s.panorama.preview.src, {
          panoData: croppedData(
            s,
            s.panorama.preview.width,
            s.panorama.preview.height,
          ),
          position: {
            yaw: radians(s.defaultYaw),
            pitch: radians(s.defaultPitch),
          },
          zoom: s.defaultZoom,
          transition: false,
          showLoader: false,
        });
        // Let the preview paint before the sharp image is decoded.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        if (token !== generation.current) return;
        const loaded = await v?.setPanorama(image.src, {
          panoData: croppedData(s, image.width, image.height),
          position: v.getPosition(),
          zoom: v.getZoomLevel(),
          transition: reduced
            ? false
            : { speed: 400, rotation: false, effect: "fade" },
          showLoader: false,
        });
        if (!loaded || token !== generation.current) return;
        markers.setMarkers([
          ...s.links.map((l) =>
            marker(
              `link-${l.target}`,
              l.yaw,
              l.pitch,
              `${props.locale === "en" ? "Go to" : "Đi đến"}: ${l.name[props.locale]}`,
              false,
              () => current.current.goTo(l.target),
            ),
          ),
          ...s.hotspots.map((h) =>
            marker(h.id, h.yaw, h.pitch, h.title[props.locale], true, () =>
              current.current.onHotspot(h),
            ),
          ),
        ]);
        if (!reduced && !interacted.current)
          v?.getPlugin<AutorotatePlugin>(AutorotatePlugin).start();
        current.current.onState("ready");
      } catch {
        if (token === generation.current) current.current.onState("error");
      }
    }
    // PSV checks its initial panorama in a constructor microtask. Starting our
    // pipeline afterwards prevents that check from launching a second load.
    queueMicrotask(() => {
      if (token === generation.current) void load();
    });
    return () => {
      lifecycle.current++;
    };
  }, [props.scene, props.locale]);
  return <div ref={host} className="tour-canvas" data-testid="tour-canvas" />;
}
