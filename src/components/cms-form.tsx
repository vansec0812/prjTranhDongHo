"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ContentInput } from "@/lib/services/cms";
import type { ContentKind } from "@prisma/client";
import { contentLabels } from "@/lib/admin";
import { slugify } from "@/lib/domain";
import { postJson, ClientError } from "@/lib/client-api";
import { Button, Field, Alert } from "./ui";
import { RichEditor } from "./rich-editor";
import { z } from "zod";
const resultSchema = z.object({ id: z.string() });
const mediaSchema = z.object({ id: z.string(), altVi: z.string() });
export function CmsForm({
  initial,
  module,
  media,
  categories,
}: {
  initial: Partial<ContentInput> & { kind: ContentKind };
  module: string;
  media: Array<{ id: string; altVi: string }>;
  categories: Array<{ id: string; titleVi: string }>;
}) {
  const form = useForm<ContentInput>({
    defaultValues: {
      titleVi: "",
      titleEn: "",
      slug: "",
      summaryVi: "",
      summaryEn: "",
      bodyVi: "",
      bodyEn: "",
      status: "DRAFT",
      categoryId: "",
      mediaId: "",
      scheduledAt: "",
      priceAdult: 150000,
      priceChild: 100000,
      durationMin: 120,
      minAge: 6,
      ...initial,
    },
  });
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [assets, setAssets] = useState(media);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const kind = initial.kind;
  async function save(values: ContentInput) {
    setBusy(true);
    setMessage("");
    try {
      const result = resultSchema.parse(
        await postJson("/api/admin", { action: "content.save", data: values }),
      );
      setSuccess(true);
      setMessage("Đã lưu nội dung vào cơ sở dữ liệu.");
      form.setValue("id", result.id);
      router.refresh();
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu. Dữ liệu nhập vẫn được giữ.",
      );
      if (error instanceof ClientError) {
        for (const key of [
          "titleVi",
          "slug",
          "sourceUrl",
          "mediaId",
          "scheduledAt",
        ] as const)
          if (error.fields[key])
            form.setError(
              key,
              { message: error.fields[key][0] },
              { shouldFocus: true },
            );
      }
    } finally {
      setBusy(false);
    }
  }
  const langField = language === "vi" ? "Vi" : "En";
  return (
    <form className="stack" onSubmit={form.handleSubmit(save)}>
      <div className="admin-toolbar">
        <h1>
          {initial.id ? "Chỉnh sửa" : "Thêm mới"}{" "}
          {contentLabels[kind].toLowerCase()}
        </h1>
        <div className="flex wrap">
          {form.watch("id") ? (
            <Link
              className="button secondary"
              href={`/admin/preview/${form.watch("id")}`}
              target="_blank"
            >
              Xem bản đã lưu
            </Link>
          ) : (
            <span className="meta">Lưu nháp trước khi xem preview.</span>
          )}
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              form.setValue("status", "DRAFT");
              form.handleSubmit(save)();
            }}
          >
            Lưu nháp
          </Button>
          <Button disabled={busy || uploading}>
            {busy ? "Đang lưu…" : "Lưu nội dung"}
          </Button>
        </div>
      </div>
      <div className="details-layout">
        <div className="stack">
          <div className="panel stack">
            <h2>Thông tin</h2>
            <div className="flex">
              <Button
                type="button"
                variant={language === "vi" ? "primary" : "secondary"}
                onClick={() => setLanguage("vi")}
              >
                Tiếng Việt
              </Button>
              <Button
                type="button"
                variant={language === "en" ? "primary" : "secondary"}
                onClick={() => setLanguage("en")}
              >
                English
              </Button>
            </div>
            {(["Vi", "En"] as const).map((lang) => (
              <div className="stack" key={lang} hidden={lang !== langField}>
                <Field
                  id={`title${lang}`}
                  label={`Tiêu đề ${lang === "Vi" ? "VI" : "EN"}${lang === "Vi" ? " *" : ""}`}
                  error={form.formState.errors[`title${lang}`]?.message}
                >
                  <input
                    className="input"
                    id={`title${lang}`}
                    {...form.register(`title${lang}`, {
                      required:
                        lang === "Vi" ? "Nhập tiêu đề tiếng Việt" : false,
                      maxLength: 200,
                      onChange: (e) => {
                        if (
                          lang === "Vi" &&
                          !initial.id &&
                          !form.formState.dirtyFields.slug
                        )
                          form.setValue(
                            "slug",
                            slugify(String(e.target.value)),
                          );
                      },
                    })}
                  />
                </Field>
                <Field id={`summary${lang}`} label="Mô tả ngắn">
                  <textarea
                    id={`summary${lang}`}
                    {...form.register(`summary${lang}`)}
                  />
                </Field>
                <Controller
                  name={`body${lang}`}
                  control={form.control}
                  render={({ field }) => (
                    <div className="field">
                      <span className="field-label">
                        Nội dung {lang === "Vi" ? "tiếng Việt" : "English"}
                      </span>
                      <RichEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        label={`Nội dung ${lang}`}
                      />
                    </div>
                  )}
                />
              </div>
            ))}
            <Field
              id="slug"
              label="Đường dẫn *"
              error={form.formState.errors.slug?.message}
            >
              <input
                className="input"
                id="slug"
                {...form.register("slug", { required: "Nhập đường dẫn" })}
              />
              <span className="meta">
                Slug đã xuất bản được lưu redirect khi đổi. Route trang tĩnh
                được khóa.
              </span>
            </Field>
          </div>
          {kind === "VIDEO" && (
            <div className="panel stack">
              <h2>Nguồn video</h2>
              <Field
                id="sourceUrl"
                label="Link YouTube / Vimeo"
                error={form.formState.errors.sourceUrl?.message}
              >
                <input
                  className="input"
                  id="sourceUrl"
                  {...form.register("sourceUrl")}
                />
              </Field>
              <Field id="durationSec" label="Thời lượng (giây)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  id="durationSec"
                  {...form.register("durationSec", { valueAsNumber: true })}
                />
              </Field>
              <Alert>
                Tự lưu video 500 MB và tiếp tục multipart cần R2, scanner và
                worker ffmpeg. Hiện chỉ nhận nguồn YouTube/Vimeo; khi xuất bản,
                server kiểm tra nguồn đang hoạt động và thumbnail.
              </Alert>
            </div>
          )}
          {kind === "WORKSHOP" && (
            <div className="panel stack">
              <h2>Chương trình trải nghiệm</h2>
              <div className="grid-2">
                {(
                  [
                    ["priceAdult", "Giá người lớn"],
                    ["priceChild", "Giá trẻ em"],
                    ["durationMin", "Thời lượng (phút)"],
                    ["minAge", "Tuổi tối thiểu"],
                  ] as const
                ).map(([name, label]) => (
                  <Field key={name} id={name} label={label}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      id={name}
                      {...form.register(name, { valueAsNumber: true })}
                    />
                  </Field>
                ))}
              </div>
              {(
                [
                  "locationVi",
                  "locationEn",
                  "includesVi",
                  "includesEn",
                ] as const
              ).map((name) => (
                <Field
                  key={name}
                  id={name}
                  label={
                    name.startsWith("location")
                      ? `Địa điểm ${name.endsWith("Vi") ? "VI" : "EN"}`
                      : `Mang về ${name.endsWith("Vi") ? "VI" : "EN"}`
                  }
                >
                  <input className="input" id={name} {...form.register(name)} />
                </Field>
              ))}
            </div>
          )}
          {kind === "PAINTING" && (
            <div className="panel stack">
              <h2>Thông tin trên tranh</h2>
              {(
                [
                  "inscription",
                  "transliteration",
                  "translationVi",
                  "translationEn",
                  "materialVi",
                  "materialEn",
                ] as const
              ).map((name, i) => (
                <Field
                  key={name}
                  id={name}
                  label={
                    [
                      "Chữ trên tranh",
                      "Phiên âm",
                      "Dịch nghĩa VI",
                      "Dịch nghĩa EN",
                      "Chất liệu VI",
                      "Chất liệu EN",
                    ][i]
                  }
                >
                  <input className="input" id={name} {...form.register(name)} />
                </Field>
              ))}
              <div className="grid-2">
                {(["widthCm", "heightCm"] as const).map((name) => (
                  <Field
                    key={name}
                    id={name}
                    label={
                      name === "widthCm" ? "Chiều rộng (cm)" : "Chiều cao (cm)"
                    }
                  >
                    <input
                      className="input"
                      type="number"
                      min={0}
                      id={name}
                      {...form.register(name, { valueAsNumber: true })}
                    />
                  </Field>
                ))}
              </div>
              <Field id="color" label="Màu chủ đạo">
                <select id="color" {...form.register("color")}>
                  <option value="ink">Mực</option>
                  <option value="vermilion">Đỏ son</option>
                  <option value="ochre">Vàng hòe</option>
                  <option value="indigo">Xanh chàm</option>
                  <option value="paper">Giấy</option>
                </select>
              </Field>
            </div>
          )}
          {kind === "MILESTONE" && (
            <div className="panel stack">
              <Field id="eraVi" label="Giai đoạn VI">
                <input
                  className="input"
                  id="eraVi"
                  {...form.register("eraVi")}
                />
              </Field>
              <Field id="eraEn" label="Giai đoạn EN">
                <input
                  className="input"
                  id="eraEn"
                  {...form.register("eraEn")}
                />
              </Field>
            </div>
          )}
          {kind === "ARTISAN" && (
            <div className="panel stack">
              <Field id="honorVi" label="Danh hiệu VI (chỉ khi đã xác minh)">
                <input
                  className="input"
                  id="honorVi"
                  {...form.register("honorVi")}
                />
              </Field>
              <Field id="honorEn" label="Danh hiệu EN">
                <input
                  className="input"
                  id="honorEn"
                  {...form.register("honorEn")}
                />
              </Field>
            </div>
          )}
          {kind === "PRODUCT" && (
            <div className="panel stack">
              <Field id="size" label="Kích thước">
                <input className="input" id="size" {...form.register("size")} />
              </Field>
              <Field id="priceRef" label="Giá tham khảo (VND)">
                <input
                  className="input"
                  id="priceRef"
                  type="number"
                  min={0}
                  {...form.register("priceRef", { valueAsNumber: true })}
                />
              </Field>
              <label className="checkbox-label">
                <input type="checkbox" {...form.register("inStock")} />
                Còn hàng
              </label>
            </div>
          )}
          {kind === "FAQ" && (
            <Field id="group" label="Nhóm câu hỏi">
              <input className="input" id="group" {...form.register("group")} />
            </Field>
          )}
          {kind === "HERO" && (
            <div className="panel stack">
              <Field id="ctaUrl" label="Đường dẫn CTA">
                <select id="ctaUrl" {...form.register("ctaUrl")}>
                  {[
                    "/workshop",
                    "/lich-su",
                    "/thu-vien-tranh",
                    "/video",
                    "/lien-he",
                  ].map((url) => (
                    <option key={url}>{url}</option>
                  ))}
                </select>
              </Field>
              <Field id="ctaLabelVi" label="CTA VI">
                <input
                  className="input"
                  id="ctaLabelVi"
                  {...form.register("ctaLabelVi")}
                />
              </Field>
              <Field id="ctaLabelEn" label="CTA EN">
                <input
                  className="input"
                  id="ctaLabelEn"
                  {...form.register("ctaLabelEn")}
                />
              </Field>
            </div>
          )}
        </div>
        <div className="stack">
          <div className="panel stack">
            <h2>Ảnh / Thumbnail</h2>
            <Field id="mediaId" label="Chọn từ thư viện">
              <select id="mediaId" {...form.register("mediaId")}>
                <option value="">Chưa chọn ảnh</option>
                {assets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.altVi}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="new-image-alt" label="Mô tả ảnh (alt)">
              <input
                className="input"
                id="new-image-alt"
                name="image-alt"
                placeholder="Ví dụ: Bàn tay quét điệp lên giấy dó"
              />
            </Field>
            <Field id="new-image-alt-en" label="Mô tả ảnh tiếng Anh (nếu có)">
              <input
                className="input"
                id="new-image-alt-en"
                name="image-alt-en"
                maxLength={500}
              />
            </Field>
            <Field id="new-image" label="Tải ảnh JPG / PNG / WebP, tối đa 5 MB">
              <input
                className="input"
                id="new-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const alt = document.getElementById("new-image-alt");
                  if (!(alt instanceof HTMLInputElement) || !alt.value.trim()) {
                    setSuccess(false);
                    setMessage("Nhập mô tả ảnh trước khi tải.");
                    return;
                  }
                  const fd = new FormData();
                  fd.set("file", file);
                  fd.set("altVi", alt.value);
                  const altEn = document.getElementById("new-image-alt-en");
                  if (altEn instanceof HTMLInputElement)
                    fd.set("altEn", altEn.value);
                  setUploading(true);
                  setProgress(0);
                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", "/api/admin/upload");
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable)
                      setProgress(
                        Math.round((event.loaded / event.total) * 100),
                      );
                  };
                  xhr.onload = () => {
                    setUploading(false);
                    try {
                      if (xhr.status !== 201)
                        throw new Error(
                          "Tải ảnh thất bại. Kiểm tra định dạng, dung lượng và kết nối.",
                        );
                      const m = mediaSchema.parse(JSON.parse(xhr.responseText));
                      setAssets((a) => [...a, m]);
                      form.setValue("mediaId", m.id);
                      setSuccess(true);
                      setMessage("Ảnh đã lưu; hãy lưu nội dung để gắn ảnh.");
                    } catch (error) {
                      setSuccess(false);
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Tải ảnh thất bại.",
                      );
                    }
                  };
                  xhr.onerror = () => {
                    setUploading(false);
                    setSuccess(false);
                    setMessage(
                      "Mất kết nối. Form vẫn giữ dữ liệu; chọn lại ảnh để thử lại.",
                    );
                  };
                  xhr.send(fd);
                }}
              />
            </Field>
            {uploading && (
              <progress
                className="progress"
                max={100}
                value={progress}
                aria-label="Tiến trình tải ảnh"
              />
            )}
            <p className="meta">
              Ảnh được decode, kiểm tra MIME/magic bytes và tạo WebP nhiều kích
              thước. Adapter local dành riêng prototype.
            </p>
          </div>
          <div className="panel stack">
            <h2>Xuất bản</h2>
            <Field id="status" label="Trạng thái">
              <select id="status" {...form.register("status")}>
                <option value="DRAFT">Nháp</option>
                <option value="PUBLISHED">Đăng ngay</option>
                <option value="SCHEDULED">Hẹn giờ</option>
              </select>
            </Field>
            <Field
              id="scheduledAt"
              label="Thời điểm hẹn giờ (ISO 8601 có múi giờ)"
            >
              <input
                className="input"
                id="scheduledAt"
                placeholder="2026-10-10T09:00:00+07:00"
                {...form.register("scheduledAt")}
              />
            </Field>
            {categories.length > 0 && (
              <Field id="categoryId" label="Danh mục">
                <select id="categoryId" {...form.register("categoryId")}>
                  <option value="">Chưa chọn</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titleVi}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field id="sortOrder" label="Thứ tự">
              <input
                className="input"
                id="sortOrder"
                type="number"
                min={0}
                {...form.register("sortOrder", { valueAsNumber: true })}
              />
            </Field>
            <label className="checkbox-label">
              <input type="checkbox" {...form.register("featured")} />
              Nổi bật / ghim
            </label>
            <p className="meta">
              Nháp và hẹn giờ chưa tới hạn không xuất hiện trên website. Worker
              xử lý xuất bản hẹn giờ.
            </p>
          </div>
          {message && <Alert error={!success}>{message}</Alert>}
          <a className="text-link" href={`/admin/${module}`}>
            Quay lại danh sách
          </a>
        </div>
      </div>
    </form>
  );
}
