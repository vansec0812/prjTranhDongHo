"use client";
import { useState, useRef } from "react";
import { Play } from "lucide-react";
import { videoEmbed } from "@/lib/domain";
import { Button, Empty } from "./ui";
import { vi, en } from "@/i18n/messages";
export function VideoPlayer({
  source,
  locale,
  id,
}: {
  source: string;
  locale: string;
  id: string;
}) {
  const [playing, setPlaying] = useState(false);
  const lastTime = useRef(0);
  const played = useRef(0);
  const counted = useRef(false);
  const embed = videoEmbed(source);
  if (!source) return <Empty>{(locale === "en" ? en : vi).site.coming}</Empty>;
  if (embed)
    return (
      <div className="stack">
        {playing ? (
          <iframe
            className="visit-map"
            src={embed.url}
            title={
              locale === "en"
                ? "Workshop video player"
                : "Trình phát video từ xưởng"
            }
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="card-media">
            <Button onClick={() => setPlaying(true)}>
              <Play size={20} />
              {locale === "en" ? "Play video" : "Phát video"}
            </Button>
          </div>
        )}
        <p className="meta">
          {locale === "en"
            ? "The external player loads after you press Play."
            : "Trình phát bên ngoài được tải sau khi bạn chọn Phát video."}
        </p>
      </div>
    );
  return (
    <video
      controls
      preload="metadata"
      className="visit-map"
      onTimeUpdate={async (e) => {
        const video = e.currentTarget;
        const delta = video.currentTime - lastTime.current;
        lastTime.current = video.currentTime;
        if (!video.paused && delta > 0 && delta < 2) played.current += delta;
        if (played.current >= 10 && !counted.current) {
          counted.current = true;
          await fetch("/api/video-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              playedSeconds: Math.floor(played.current),
            }),
          });
        }
      }}
      onSeeking={() => {
        lastTime.current = 0;
      }}
    >
      <source src={source} />
      {locale === "en"
        ? "Your browser cannot play this video."
        : "Trình duyệt không hỗ trợ phát video."}
    </video>
  );
}
