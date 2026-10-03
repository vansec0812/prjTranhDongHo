"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./ui";
export function Lightbox({
  src,
  alt,
  width,
  height,
  locale,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  locale: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        ref={opener}
        onClick={() => dialog.current?.showModal()}
      >
        <ZoomIn size={18} />
        {locale === "en" ? "View larger" : "Xem phóng to"}
      </Button>
      <dialog
        ref={dialog}
        className="dialog"
        aria-label={alt}
        onClose={() => {
          setZoom(false);
          opener.current?.focus();
        }}
      >
        <div className="flex spread">
          <p>{alt}</p>
          <div className="flex">
            <button
              className="icon-button"
              aria-label={locale === "en" ? "Toggle zoom" : "Đổi mức phóng to"}
              onClick={() => setZoom(!zoom)}
            >
              {zoom ? <ZoomOut /> : <ZoomIn />}
            </button>
            <button
              className="icon-button"
              onClick={() => dialog.current?.close()}
              aria-label={locale === "en" ? "Close" : "Đóng"}
            >
              <X />
            </button>
          </div>
        </div>
        <div style={{ overflow: "auto" }}>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            unoptimized={src.endsWith(".svg")}
            style={
              zoom
                ? {
                    maxWidth: "none",
                    width: width * 2,
                    height: "auto",
                    maxHeight: "none",
                  }
                : {}
            }
          />
        </div>
      </dialog>
    </>
  );
}
