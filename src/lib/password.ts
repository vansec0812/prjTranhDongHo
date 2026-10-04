import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

function derive(
  password: string,
  nonce: Buffer,
  memory: number,
  passes: number,
  parallelism: number,
  tagLength: number,
) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2(
      "argon2id",
      { message: password, nonce, memory, passes, parallelism, tagLength },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}
const base64 = (value: Buffer) => value.toString("base64").replace(/=+$/, "");

// Preserve the existing Argon2id PHC representation and work factors. Node 24
// supplies the implementation, avoiding a platform-specific npm native binary.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const digest = await derive(password, salt, 65536, 3, 1, 32);
  return `$argon2id$v=19$m=65536,t=3,p=1$${base64(salt)}$${base64(digest)}`;
}
export async function verifyPassword(encoded: string, password: string) {
  const match =
    /^\$argon2id\$v=19\$([mtp]=\d+(?:,[mtp]=\d+){2})\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(
      encoded,
    );
  if (!match) return false;
  const [, parameters, saltText, hashText] = match;
  // node-argon2 stored m,p,t; PHC writers may use m,t,p. Parameter order has
  // no meaning. Reject duplicate/missing keys, then use their explicit names.
  const values = new Map<string, number>();
  for (const parameter of parameters.split(","))
    values.set(parameter[0], Number(parameter.slice(2)));
  if (values.size !== 3) return false;
  const memory = values.get("m") ?? 0,
    passes = values.get("t") ?? 0,
    parallelism = values.get("p") ?? 0;
  const salt = Buffer.from(saltText, "base64"),
    expected = Buffer.from(hashText, "base64");
  // Reject corrupted or unsupported parameters rather than allocating unbounded
  // resources from a DB value. All hashes previously created use these bounds.
  if (
    memory < 19456 ||
    memory > 131072 ||
    passes < 2 ||
    passes > 10 ||
    parallelism < 1 ||
    parallelism > 8 ||
    salt.length < 16 ||
    salt.length > 32 ||
    expected.length < 16 ||
    expected.length > 64 ||
    base64(salt) !== saltText ||
    base64(expected) !== hashText
  )
    return false;
  const actual = await derive(
    password,
    salt,
    memory,
    passes,
    parallelism,
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
