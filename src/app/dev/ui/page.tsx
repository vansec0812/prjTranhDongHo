import { notFound } from "next/navigation";
import "@/styles/globals.css";
import {
  Button,
  ButtonLink,
  Seal,
  Wave,
  Alert,
  Badge,
  Field,
  Empty,
} from "@/components/ui";
export default function Showcase() {
  if (process.env.APP_MODE !== "prototype") notFound();
  return (
    <main className="container section">
      <p className="eyebrow">Baseline UI · Chưa phê duyệt thiết kế</p>
      <h1>Giấy dó, nét mực & màu son</h1>
      <div className="flex wrap">
        <Seal />
        <ButtonLink href="/">Trang chủ</ButtonLink>
        <Button variant="secondary">Nút phụ</Button>
        <Button disabled>Đang tải…</Button>
        <Badge>Còn chỗ</Badge>
        <Badge error>Đã đóng</Badge>
      </div>
      <Wave />
      <div className="grid-2 section">
        <div className="stack">
          <h2>Playfair Display</h2>
          <p>Be Vietnam Pro: Đường làng, giấy điệp, nét khắc và dấu son.</p>
          <Field id="sample" label="Họ và tên">
            <input className="input" id="sample" />
          </Field>
          <Field id="invalid" label="Email" error="Nhập địa chỉ email hợp lệ">
            <input
              className="input"
              id="invalid"
              aria-invalid="true"
              aria-describedby="invalid-error"
            />
          </Field>
          <Alert>Đã lưu vào cơ sở dữ liệu.</Alert>
          <Alert error>Không thể lưu. Nội dung nhập vẫn được giữ.</Alert>
        </div>
        <div className="stack">
          <h3>Bảng màu khóa</h3>
          <div className="swatches">
            {[
              "paper",
              "paper-alt",
              "ink",
              "vermilion",
              "ochre",
              "indigo",
              "wood",
            ].map((token) => (
              <div key={token}>
                <span
                  className="swatch"
                  style={{
                    display: "block",
                    background: `var(--${token})`,
                  }}
                />
                <span className="meta">{token}</span>
              </div>
            ))}
          </div>
          <details className="accordion">
            <summary>Câu hỏi mẫu</summary>
            <p>Nội dung mở được bằng bàn phím.</p>
          </details>
          <Empty>Chưa có dữ liệu.</Empty>
        </div>
      </div>
    </main>
  );
}
