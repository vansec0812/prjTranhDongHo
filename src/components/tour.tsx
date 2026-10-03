"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  Info,
  List,
  Map,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button, ButtonLink, Alert } from "./ui";
import { localHref, type Locale } from "@/lib/links";
import type { Tour, TourHotspot } from "@/lib/tour";
import type { TourControls } from "./tour-viewer";
const Viewer = dynamic(
  () => import("./tour-viewer").then((m) => m.TourViewer),
  { ssr: false },
);
type Panel = "scenes" | "scene" | "art" | null;
export function TourExperience({
  configuration,
  initialId,
  locale,
  workshopHref,
  hasOpenSession = false,
  picker = false,
}: {
  configuration: Tour;
  initialId: string;
  locale: Locale;
  workshopHref: string;
  hasOpenSession?: boolean;
  picker?: boolean;
}) {
  const en = locale === "en";
  const [id, setId] = useState(initialId);
  const scene =
    configuration.scenes.find((s) => s.id === id) ?? configuration.scenes[0];
  const index = configuration.scenes.findIndex((s) => s.id === scene.id);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [available, setAvailable] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [hotspot, setHotspot] = useState<TourHotspot | null>(null);
  const [rotating, setRotating] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [message, setMessage] = useState("");
  const [narrating, setNarrating] = useState(false);
  const [music, setMusic] = useState(false);
  const [pick, setPick] = useState<{ yaw: number; pitch: number } | null>(null);
  const [retry, setRetry] = useState(0);
  const controls = useRef<TourControls | null>(null);
  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const narration = useRef<HTMLAudioElement | null>(null);
  const ambient = useRef<HTMLAudioElement | null>(null);
  const narratingRef = useRef(false);
  const narrationUrl = scene.narration[locale];
  const detectRenderer = useCallback(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      if (!context) {
        setCanRender(false);
        setStatus("error");
        return;
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
      setCanRender(true);
    } catch {
      setCanRender(false);
      setStatus("error");
    }
  }, []);
  useEffect(detectRenderer, [detectRenderer]);
  const ready = useCallback((value: TourControls | null) => {
    controls.current = value;
    setAvailable(Boolean(value));
  }, []);
  const state = useCallback((value: "loading" | "ready" | "error") => {
    setStatus(value);
    if (value === "ready") setRotating(controls.current?.isRotating() ?? false);
  }, []);
  const goTo = useCallback(
    (next: string) => {
      if (!configuration.scenes.some((s) => s.id === next)) return;
      setId(next);
      setStatus("loading");
      setMessage("");
      setRotating(false);
      const url = new URL(window.location.href);
      url.searchParams.set("diem", next);
      window.history.pushState({ tourPoint: next }, "", url);
      dialog.current?.close();
    },
    [configuration.scenes],
  );
  const showHotspot = useCallback((h: TourHotspot) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    controls.current?.autorotate(false);
    setRotating(false);
    setHotspot(h);
    setPanel("art");
  }, []);
  function open(next: Panel, event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    controls.current?.autorotate(false);
    setRotating(false);
    setPanel(next);
  }
  useEffect(() => {
    if (panel) dialog.current?.showModal();
  }, [panel]);
  useEffect(() => {
    const pop = () => {
      const next = new URL(window.location.href).searchParams.get("diem");
      if (configuration.scenes.some((s) => s.id === next))
        setId(next ?? initialId);
      else setId(initialId);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [configuration.scenes, initialId]);
  useEffect(() => {
    // Load the current view first; neighbors must not compete with it on mobile data.
    if (status !== "ready") return;
    const neighbours = scene.links
      .map((l) => configuration.scenes.find((s) => s.id === l.target))
      .filter((s) => s !== undefined);
    const images = neighbours.map((s) => {
      const image = new window.Image();
      image.fetchPriority = "low";
      image.src =
        window.innerWidth <= 768 ? s.panorama.mobile.src : s.panorama.large.src;
      return image;
    });
    return () =>
      images.forEach((image) => {
        image.src = "";
      });
  }, [scene, configuration.scenes, status]);
  useEffect(() => {
    narration.current?.pause();
    if (narrationUrl) {
      const audio = new Audio(narrationUrl);
      narration.current = audio;
      audio.addEventListener("ended", () => {
        setNarrating(false);
        narratingRef.current = false;
        if (ambient.current) ambient.current.volume = 0.5;
      });
      if (narratingRef.current)
        void audio.play().catch(() => {
          setNarrating(false);
          narratingRef.current = false;
          setMessage(
            en
              ? "Press narration to play at this viewpoint."
              : "Bấm thuyết minh để phát tại điểm này.",
          );
        });
    } else {
      narration.current = null;
      setNarrating(false);
      narratingRef.current = false;
    }
    return () => narration.current?.pause();
  }, [narrationUrl, en]);
  useEffect(
    () => () => {
      narration.current?.pause();
      ambient.current?.pause();
    },
    [],
  );
  async function toggleNarration() {
    const audio = narration.current;
    if (!audio) return;
    try {
      if (narrating) {
        audio.pause();
        narratingRef.current = false;
        setNarrating(false);
      } else {
        await audio.play();
        narratingRef.current = true;
        setNarrating(true);
      }
      if (ambient.current) ambient.current.volume = narrating ? 0.5 : 0.15;
    } catch {
      setMessage(
        en
          ? "Narration could not play. Please try again."
          : "Chưa phát được thuyết minh. Vui lòng thử lại.",
      );
    }
  }
  async function toggleMusic() {
    if (!configuration.backgroundAudio) return;
    if (!ambient.current) {
      ambient.current = new Audio(configuration.backgroundAudio);
      ambient.current.loop = true;
    }
    try {
      if (music) ambient.current.pause();
      else {
        ambient.current.volume = narrating ? 0.15 : 0.5;
        await ambient.current.play();
      }
      setMusic(!music);
    } catch {
      setMessage(
        en
          ? "Background audio could not play."
          : "Chưa phát được âm thanh nền.",
      );
    }
  }
  async function fullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setMessage(
        en
          ? "Fullscreen is unavailable in this browser."
          : "Trình duyệt này chưa hỗ trợ toàn màn hình.",
      );
    }
  }
  function stopRotation() {
    controls.current?.autorotate(false);
    setRotating(false);
  }
  const pickPosition = useCallback(
    (position: { yaw: number; pitch: number }) =>
      setPick({
        yaw: Math.round(position.yaw * 10) / 10,
        pitch: Math.round(position.pitch * 10) / 10,
      }),
    [],
  );
  return (
    <section
      className="tour-experience"
      ref={root}
      aria-label={
        en ? "Interactive exhibition tour" : "Chuyến tham quan tương tác"
      }
      data-state={status}
      onPointerDownCapture={stopRotation}
    >
      <div className="tour-stage">
        <link
          rel="preload"
          as="image"
          href={scene.panorama.mobile.src}
          media="(max-width: 768px)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href={scene.panorama.large.src}
          media="(min-width: 769px)"
          fetchPriority="high"
        />
        <h1 className="sr-only">{configuration.title[locale]}</h1>
        <Image
          className="tour-backdrop"
          src={scene.panorama.preview.src}
          alt={scene.description[locale]}
          fill
          sizes="100vw"
          priority
          unoptimized
        />
        {canRender && status !== "error" && (
          <Viewer
            key={retry}
            scene={scene}
            locale={locale}
            onReady={ready}
            onState={state}
            goTo={goTo}
            onHotspot={showHotspot}
            onPick={picker ? pickPosition : undefined}
          />
        )}
        {status === "error" && (
          <div className="tour-flat">
            <Image
              src={scene.panorama.mobile.src}
              alt={scene.description[locale]}
              width={scene.panorama.mobile.width}
              height={scene.panorama.mobile.height}
              unoptimized
            />
            <div className="tour-fallback">
              <p>
                {en
                  ? "View the panoramic photograph. You can still explore every viewpoint and its details."
                  : "Xem ảnh panorama. Bạn vẫn có thể chọn mọi điểm và đọc nội dung chi tiết."}
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus("loading");
                  setRetry((r) => r + 1);
                  detectRenderer();
                }}
              >
                {en
                  ? "Retry interactive view"
                  : "Thử mở lại góc nhìn tương tác"}
              </Button>
            </div>
          </div>
        )}
        <div className="tour-heading">
          <p className="eyebrow">
            {en ? "DONG HO · VIRTUAL VISIT" : "ĐÔNG HỒ · THAM QUAN TRONG ẢNH"}
          </p>
          <h2>{scene.name[locale]}</h2>
          <p className="small">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(configuration.scenes.length).padStart(2, "0")} ·{" "}
            {en ? "Exhibition space" : "Không gian trưng bày"}
          </p>
          <button className="text-link" onClick={(e) => open("scene", e)}>
            <Info size={16} />
            {en ? "About this viewpoint" : "Câu chuyện tại điểm này"}
          </button>
        </div>
        <div className="tour-sound">
          <button
            className="tour-control"
            aria-pressed={narrating}
            disabled={!narrationUrl}
            title={
              narrationUrl
                ? en
                  ? "Narration"
                  : "Thuyết minh"
                : en
                  ? "No narration at this viewpoint"
                  : "Điểm này chưa có thuyết minh"
            }
            onClick={() => void toggleNarration()}
          >
            {narrating ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span>{en ? "Narration" : "Thuyết minh"}</span>
          </button>
          {configuration.backgroundAudio && (
            <button
              className="tour-control"
              aria-pressed={music}
              onClick={() => void toggleMusic()}
            >
              {music ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <span>{en ? "Ambience" : "Âm thanh nền"}</span>
            </button>
          )}
        </div>
        <div
          className="tour-tools"
          aria-label={en ? "View controls" : "Điều khiển góc nhìn"}
        >
          <button
            className="tour-control"
            aria-label={en ? "Zoom in" : "Phóng to"}
            title={en ? "Zoom in" : "Phóng to"}
            disabled={!available || status !== "ready"}
            onClick={() => {
              stopRotation();
              controls.current?.zoom(10);
            }}
          >
            <Plus />
          </button>
          <button
            className="tour-control"
            aria-label={en ? "Zoom out" : "Thu nhỏ"}
            title={en ? "Zoom out" : "Thu nhỏ"}
            disabled={!available || status !== "ready"}
            onClick={() => {
              stopRotation();
              controls.current?.zoom(-10);
            }}
          >
            <Minus />
          </button>
          <button
            className="tour-control"
            aria-label={en ? "Automatic rotation" : "Tự xoay góc nhìn"}
            title={en ? "Automatic rotation" : "Tự xoay góc nhìn"}
            aria-pressed={rotating}
            disabled={!available || status !== "ready"}
            onClick={() => {
              controls.current?.autorotate(!rotating);
              setRotating(!rotating);
            }}
          >
            <RotateCw />
          </button>
          <button
            className="tour-control"
            aria-label={en ? "Reset view" : "Về góc nhìn ban đầu"}
            title={en ? "Reset view" : "Về góc nhìn ban đầu"}
            disabled={!available || status !== "ready"}
            onClick={() => {
              stopRotation();
              controls.current?.reset();
            }}
          >
            <RotateCcw />
          </button>
          <button
            className="tour-control"
            aria-label={en ? "Fullscreen" : "Toàn màn hình"}
            title={en ? "Fullscreen" : "Toàn màn hình"}
            onClick={() => void fullScreen()}
          >
            <Expand />
          </button>
          <button
            className="tour-control"
            aria-label={
              en ? "Use device motion" : "Xem bằng chuyển động điện thoại"
            }
            title={en ? "Use device motion" : "Xem bằng chuyển động điện thoại"}
            aria-pressed={gyro}
            disabled={!available || status !== "ready"}
            onClick={() =>
              void controls.current
                ?.gyroscope()
                .then(setGyro)
                .catch(() =>
                  setMessage(
                    en
                      ? "Device motion is unavailable or permission was declined."
                      : "Thiết bị chưa hỗ trợ hoặc chưa cho phép cảm biến chuyển động.",
                  ),
                )
            }
          >
            <Compass />
          </button>
        </div>
        {status === "loading" && (
          <p className="tour-loading" role="status">
            {en ? "Opening the view…" : "Đang mở góc nhìn…"}
          </p>
        )}
        <div
          className="tour-direction"
          tabIndex={0}
          role="group"
          aria-label={
            en
              ? "Drag to look around. When focused, use arrow keys to look and plus or minus to zoom."
              : "Kéo để nhìn quanh. Khi chọn vùng này, dùng phím mũi tên để nhìn và phím cộng, trừ để thu phóng."
          }
          onPointerDown={stopRotation}
          onWheel={stopRotation}
          onKeyDown={(e) => {
            const steps: Record<string, [number, number]> = {
              ArrowLeft: [-0.1, 0],
              ArrowRight: [0.1, 0],
              ArrowUp: [0, 0.1],
              ArrowDown: [0, -0.1],
            };
            const step = steps[e.key];
            if (step) {
              e.preventDefault();
              stopRotation();
              controls.current?.rotate(...step);
            } else if (e.key === "+" || e.key === "-") {
              e.preventDefault();
              stopRotation();
              controls.current?.zoom(e.key === "+" ? 10 : -10);
            }
          }}
        >
          <span>{en ? "Drag to look around" : "Kéo ảnh để nhìn quanh"}</span>
          <span className="sr-only">{scene.description[locale]}</span>
        </div>
        <nav
          className="tour-map"
          aria-label={
            en
              ? "Suggested exhibition route"
              : "Lộ trình gợi ý trong gian trưng bày"
          }
        >
          <span>
            <Map size={16} />
            {en ? "The route" : "Lộ trình"}
          </span>
          <div>
            {configuration.scenes.map((s, i) => (
              <button
                key={s.id}
                className={s.id === scene.id ? "active" : ""}
                aria-label={`${i + 1}. ${s.name[locale]}`}
                aria-current={s.id === scene.id ? "location" : undefined}
                title={s.name[locale]}
                onClick={() => goTo(s.id)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </nav>
        {picker && (
          <output className="tour-picker">
            {pick
              ? JSON.stringify({ yaw: pick.yaw, pitch: pick.pitch })
              : "Click the panorama to read yaw/pitch."}
          </output>
        )}
      </div>
      <div className="tour-bottom">
        <button className="button secondary" onClick={(e) => open("scenes", e)}>
          <List size={18} />
          {en ? "Viewpoints" : "Các điểm tham quan"}
        </button>
        <nav
          className="tour-thumbnails"
          aria-label={en ? "Choose a viewpoint" : "Chọn điểm tham quan"}
        >
          {configuration.scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              aria-current={s.id === scene.id ? "location" : undefined}
              className={s.id === scene.id ? "active" : ""}
            >
              <Image
                src={s.panorama.thumb.src}
                alt=""
                width={120}
                height={48}
                unoptimized
              />
              <span>
                {String(i + 1).padStart(2, "0")} {s.name[locale]}
              </span>
            </button>
          ))}
        </nav>
        <ButtonLink href={workshopHref}>
          {en
            ? hasOpenSession
              ? "Book a workshop"
              : "View workshops"
            : hasOpenSession
              ? "Giữ chỗ workshop"
              : "Xem lịch workshop"}
          <ArrowRight size={18} />
        </ButtonLink>
      </div>
      <div className="tour-accessible">
        <p className="meta">{scene.description[locale]}</p>
        <div className="flex wrap">
          <Button
            variant="secondary"
            disabled={index === 0}
            title={
              index === 0
                ? en
                  ? "First viewpoint"
                  : "Bạn đang ở điểm đầu tiên"
                : undefined
            }
            onClick={() => goTo(configuration.scenes[index - 1].id)}
          >
            <ChevronLeft size={18} />
            {en ? "Previous" : "Điểm trước"}
          </Button>
          <Button
            variant="secondary"
            disabled={index === configuration.scenes.length - 1}
            title={
              index === configuration.scenes.length - 1
                ? en
                  ? "Last viewpoint"
                  : "Bạn đang ở điểm cuối cùng"
                : undefined
            }
            onClick={() => goTo(configuration.scenes[index + 1].id)}
          >
            {en ? "Next viewpoint" : "Điểm tiếp theo"}
            <ChevronRight size={18} />
          </Button>
          {scene.hotspots.map((h) => (
            <button
              className="text-link"
              key={h.id}
              onClick={() => showHotspot(h)}
            >
              <Info size={16} />
              {h.title[locale]}
            </button>
          ))}
          <Link className="text-link" href={localHref(locale, "/tham-quan")}>
            <ArrowLeft size={16} />
            {en ? "Plan a visit" : "Lên kế hoạch tham quan"}
          </Link>
        </div>
        {message && <Alert>{message}</Alert>}
        {!narrationUrl && (
          <p className="meta">
            {en
              ? "Narration is not available at this viewpoint. Explore the photographs and descriptions."
              : "Điểm này chưa có thuyết minh. Bạn có thể khám phá qua ảnh và phần mô tả."}
          </p>
        )}
      </div>
      <dialog
        ref={dialog}
        className="dialog tour-dialog"
        aria-label={
          panel === "scenes"
            ? en
              ? "Viewpoints"
              : "Các điểm tham quan"
            : panel === "art"
              ? hotspot?.title[locale]
              : scene.name[locale]
        }
        onClose={() => {
          setPanel(null);
          opener.current?.focus();
        }}
      >
        <div className="flex spread">
          <p className="eyebrow">
            {panel === "scenes"
              ? en
                ? "CHOOSE YOUR NEXT STOP"
                : "CHỌN ĐIỂM DỪNG TIẾP THEO"
              : en
                ? "A CLOSER LOOK"
                : "DỪNG LẠI VÀ KHÁM PHÁ"}
          </p>
          <button
            className="icon-button"
            aria-label={en ? "Close" : "Đóng"}
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {panel === "scenes" ? (
          <div className="tour-scene-list">
            {configuration.scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                aria-current={s.id === scene.id ? "location" : undefined}
              >
                <Image
                  src={s.panorama.thumb.src}
                  alt=""
                  width={160}
                  height={64}
                  unoptimized
                />
                <span>
                  <strong>
                    {String(i + 1).padStart(2, "0")} · {s.name[locale]}
                  </strong>
                  <span>{s.description[locale]}</span>
                </span>
              </button>
            ))}
          </div>
        ) : panel === "art" && hotspot ? (
          <>
            <h2>{hotspot.title[locale]}</h2>
            <Image
              className="tour-detail-image painting"
              src={hotspot.image}
              alt={hotspot.title[locale]}
              width={900}
              height={600}
            />
            <p>{hotspot.description[locale]}</p>
            <div className="flex wrap">
              <ButtonLink
                href={localHref(
                  locale,
                  `/thu-vien-tranh/${hotspot.paintingSlug}`,
                )}
              >
                {en ? "Explore this print" : "Xem chi tiết tranh"}
              </ButtonLink>
              <ButtonLink
                secondary
                href={localHref(
                  locale,
                  `/lien-he?chu-de=painting&tranh=${hotspot.paintingSlug}`,
                )}
              >
                {en ? "Enquire about the print" : "Liên hệ đặt tranh"}
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <h2>{scene.name[locale]}</h2>
            <Image
              className="tour-detail-image"
              src={scene.photo}
              alt={scene.description[locale]}
              width={1600}
              height={1067}
            />
            <p>{scene.description[locale]}</p>
            <ButtonLink href={workshopHref}>
              {en ? "Explore printing workshops" : "Khám phá workshop in tranh"}
            </ButtonLink>
          </>
        )}
      </dialog>
    </section>
  );
}
