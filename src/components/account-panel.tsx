"use client";
import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client-api";
import { ActionForm } from "./admin-actions";
import { DataTable, Button, Alert, Field } from "./ui";
type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  totp: boolean;
};
const totpSchema = z.object({
  token: z.string(),
  secret: z.string(),
  uri: z.string(),
});
export function AccountPanel({
  users,
  ownId,
}: {
  users: User[];
  ownId: string;
}) {
  const [setup, setSetup] = useState<z.infer<typeof totpSchema> | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="stack">
      <h1>Tài khoản admin</h1>
      <DataTable label="Tài khoản admin">
        <thead>
          <tr>
            <th>Tên / Email</th>
            <th>Hoạt động</th>
            <th>2FA</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                {user.name}
                <br />
                {user.email}
              </td>
              <td>{user.active ? "Có" : "Không"}</td>
              <td>{user.totp ? "Đã bật" : "Chưa bật"}</td>
              <td>
                <ActionForm
                  endpoint="/api/admin/account"
                  action="toggle"
                  preset={{ id: user.id, active: !user.active }}
                  fields={[]}
                  label={user.active ? "Vô hiệu hóa" : "Kích hoạt"}
                  confirm
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <div className="grid-2">
        <div className="panel stack">
          <h2>Mời admin mới</h2>
          <ActionForm
            endpoint="/api/admin/account"
            action="invite"
            fields={[
              {
                name: "email",
                label: "Email người được mời",
                type: "email",
                required: true,
              },
              { name: "name", label: "Tên hiển thị", required: true },
            ]}
            label="Tạo lời mời qua email"
          />
        </div>
        <div className="panel stack">
          <h2>Đổi mật khẩu của bạn</h2>
          <ActionForm
            endpoint="/api/admin/account"
            action="password"
            fields={[
              {
                name: "currentPassword",
                label: "Mật khẩu hiện tại",
                type: "password",
                required: true,
              },
              {
                name: "password",
                label: "Mật khẩu mới (ít nhất 12 ký tự)",
                type: "password",
                required: true,
              },
            ]}
            label="Đổi mật khẩu & thu hồi phiên"
          />
        </div>
      </div>
      <div className="panel stack">
        <h2>Xác thực hai lớp TOTP</h2>
        {users.find((u) => u.id === ownId)?.totp ? (
          <ActionForm
            endpoint="/api/admin/account"
            action="totp.disable"
            fields={[
              {
                name: "password",
                label: "Mật khẩu",
                type: "password",
                required: true,
              },
              { name: "code", label: "Mã TOTP hiện tại", required: true },
            ]}
            label="Tắt 2FA"
            confirm
          />
        ) : (
          <>
            <Field id="totp-password" label="Nhập mật khẩu để chuẩn bị 2FA">
              <input
                id="totp-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button
              disabled={!password}
              onClick={async () => {
                try {
                  setSetup(
                    totpSchema.parse(
                      await postJson("/api/admin/account", {
                        action: "totp.setup",
                        password,
                      }),
                    ),
                  );
                  setMessage("");
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Không thể chuẩn bị 2FA.",
                  );
                }
              }}
            >
              Chuẩn bị 2FA
            </Button>
            {setup && (
              <>
                <Alert>
                  Nhập khóa dưới đây vào ứng dụng xác thực (TOTP). Không gửi
                  khóa cho người khác. Phiên chuẩn bị hết hạn sau 10 phút.
                </Alert>
                <p>
                  <code>{setup.secret}</code>
                </p>
                <a className="text-link" href={setup.uri}>
                  Mở trong ứng dụng xác thực
                </a>
                <ActionForm
                  endpoint="/api/admin/account"
                  action="totp.enable"
                  preset={{ token: setup.token }}
                  fields={[
                    {
                      name: "code",
                      label: "Mã 6 chữ số từ ứng dụng",
                      required: true,
                    },
                  ]}
                  label="Xác minh & bật 2FA"
                />
              </>
            )}
          </>
        )}
        {message && <Alert error>{message}</Alert>}
        <Button variant="secondary" onClick={() => router.refresh()}>
          Tải lại trạng thái
        </Button>
      </div>
    </div>
  );
}
