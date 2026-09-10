// Un PUT firmado a S3, sin SDK.
//
// POR QUÉ A MANO. El aws-sdk pesa decenas de MB y aquí se usa una sola
// operación, una vez al día, desde una función serverless donde cada MB del
// bundle es arranque en frío. Firmar un PUT con SigV4 son sesenta líneas de
// HMAC con `node:crypto`, que ya está en el runtime.
//
// COMPATIBLE CON CUALQUIER S3. R2, Backblaze B2, MinIO o Spaces hablan el mismo
// protocolo: basta con `S3_ENDPOINT`. El bucket debe ser PRIVADO — dentro van
// comprobantes con el documento de identidad de personas reales.
//
// Server only.

import { createHash, createHmac } from "node:crypto";

export type S3Config = {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  /** Host alternativo para un S3 que no es de AWS. Sin esto, el de AWS. */
  endpoint: string | null;
};

/** La configuración, o null si este despliegue no tiene backup activado. */
export function readS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET_CDRS?.trim();
  const accessKey = process.env.S3_ACCESS_KEY?.trim();
  const secretKey = process.env.S3_SECRET_KEY?.trim();
  if (!bucket || !accessKey || !secretKey) return null;
  return {
    bucket,
    region: process.env.S3_REGION?.trim() || "us-east-1",
    accessKey,
    secretKey,
    endpoint: process.env.S3_ENDPOINT?.trim() || null,
  };
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) =>
  createHmac("sha256", key).update(data, "utf8").digest();

/** Cada segmento del path se codifica salvo la barra, como exige SigV4. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (c) =>
      `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    ))
    .join("/");
}

export type PutResult = { ok: true; url: string } | { ok: false; message: string };
export type StorageHealthResult =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: number; message: string };

/** Verifies credentials and bucket reachability without reading or writing objects. */
export async function checkBucket(config: S3Config): Promise<StorageHealthResult> {
  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const canonicalPath = config.endpoint ? `/${config.bucket}` : "/";
  const protocol = config.endpoint ? new URL(config.endpoint).protocol : "https:";
  const payloadHash = sha256("");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((header) => `${header}:${headers[header]}\n`)
    .join("");
  const canonicalRequest = [
    "HEAD",
    canonicalPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretKey}`, dateStamp), config.region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${protocol}//${host}${canonicalPath}`, {
      method: "HEAD",
      headers: { ...headers, authorization },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    return response.ok
      ? { ok: true, latencyMs }
      : { ok: false, latencyMs, message: `S3 respondió HTTP ${response.status}.` };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message:
        error instanceof Error && error.name === "AbortError"
          ? "S3 no respondió en 5 segundos."
          : "No se pudo conectar con S3.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sube un objeto. Devuelve la URL s3:// como referencia — nunca una URL pública:
 * el bucket es privado y un enlace firmado se genera cuando alguien lo pida.
 */
export async function putObject(
  config: S3Config,
  key: string,
  body: string | Buffer,
  contentType = "application/json"
): Promise<PutResult> {
  const payload = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const payloadHash = sha256(payload);

  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  // Un endpoint propio usa el bucket en el path; AWS, en el subdominio.
  const canonicalPath = config.endpoint
    ? `/${config.bucket}/${encodeKey(key)}`
    : `/${encodeKey(key)}`;
  const protocol = config.endpoint ? new URL(config.endpoint).protocol : "https:";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    // Cifrado en reposo del lado del servidor. Dentro van datos personales.
    "x-amz-server-side-encryption": "AES256",
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h]}\n`)
    .join("");

  const canonicalRequest = [
    "PUT",
    canonicalPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretKey}`, dateStamp), config.region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${protocol}//${host}${canonicalPath}`, {
      method: "PUT",
      headers: { ...headers, authorization: authorization },
      body: new Uint8Array(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      // El cuerpo de error de S3 es XML y trae el código; se recorta porque
      // puede ser largo y no aporta nada más allá del motivo.
      const text = (await res.text()).slice(0, 300);
      return { ok: false, message: `S3 respondió HTTP ${res.status}. ${text}` };
    }
    return { ok: true, url: `s3://${config.bucket}/${key}` };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      message: aborted ? "S3 no respondió en 20 segundos." : "No pudimos conectar con S3.",
    };
  } finally {
    clearTimeout(timer);
  }
}
