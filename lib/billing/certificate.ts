// Reads what can be read out of a .pfx/.p12 without ever leaving the server.
//
// Two things make this worth doing at upload time instead of at emission time:
// opening the container with the given password proves the password is right
// (a wrong one is otherwise discovered weeks later, on the first comprobante),
// and the expiry date is what the settings page has to show. Both are cached
// on BillingCredentials so the container is only opened when it changes.
//
// Server only: node-forge plus Buffer.

import forge from "node-forge";

export type CertificateInfo = {
  subject: string | null;
  /** Common name of the holder, when the subject carries one. */
  holder: string | null;
  /** RUC found in the subject, if any — used to warn about a mismatch. */
  ruc: string | null;
  expiresAt: Date | null;
  issuedAt: Date | null;
};

export type CertificateRead =
  | { ok: true; info: CertificateInfo }
  | { ok: false; reason: "password" | "unreadable"; message: string };

const RUC_IN_TEXT = /\b(?:10|15|17|20)\d{9}\b/;

export function inspectCertificate(der: Buffer, password: string): CertificateRead {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(der.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // forge phrases a bad password two different ways depending on whether the
    // MAC or the content decryption is what failed first.
    if (/password|mac could not be verified|invalid/i.test(message)) {
      return {
        ok: false,
        reason: "password",
        message: "La contraseña no abre este certificado. Revísala y vuelve a intentar.",
      };
    }
    return {
      ok: false,
      reason: "unreadable",
      message:
        "No pudimos leer el archivo. Asegúrate de subir el .pfx o .p12 que te entregó tu proveedor.",
    };
  }

  try {
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certs = (bags[forge.pki.oids.certBag] ?? [])
      .map((bag) => bag.cert)
      .filter((cert): cert is forge.pki.Certificate => cert != null);

    if (certs.length === 0) {
      return {
        ok: false,
        reason: "unreadable",
        message: "El archivo se abrió, pero no contiene ningún certificado.",
      };
    }

    // A .pfx usually carries the chain as well. The one that identifies the
    // taxpayer is the leaf: not a CA, and the last to have been issued.
    const leaf =
      certs
        .filter((c) => !isCa(c))
        .sort((a, b) => b.validity.notBefore.getTime() - a.validity.notBefore.getTime())[0] ??
      certs[0];

    const subject = leaf.subject.attributes
      .map((attr) => `${attr.shortName ?? attr.name ?? ""}=${attr.value ?? ""}`)
      .filter((part) => part.length > 1)
      .join(", ");

    const holder =
      (leaf.subject.getField("CN")?.value as string | undefined) ??
      (leaf.subject.getField("O")?.value as string | undefined) ??
      null;

    const serialAttr = leaf.subject.attributes.find(
      (a) => a.shortName === "serialNumber" || a.name === "serialNumber"
    );
    const ruc =
      matchRuc(typeof serialAttr?.value === "string" ? serialAttr.value : "") ??
      matchRuc(subject);

    return {
      ok: true,
      info: {
        subject: subject || null,
        holder: holder ?? null,
        ruc,
        expiresAt: leaf.validity.notAfter ?? null,
        issuedAt: leaf.validity.notBefore ?? null,
      },
    };
  } catch {
    // The password was right — the container opened — but the contents are not
    // shaped the way we expect. Keep the file; just admit we cannot read it.
    return {
      ok: false,
      reason: "unreadable",
      message: "El certificado se abrió pero no pudimos leer sus datos.",
    };
  }
}

function isCa(cert: forge.pki.Certificate): boolean {
  const ext = cert.extensions?.find((e) => e.name === "basicConstraints") as
    | { cA?: boolean }
    | undefined;
  return ext?.cA === true;
}

function matchRuc(text: string): string | null {
  const found = text.replace(/\s/g, "").match(RUC_IN_TEXT);
  return found ? found[0] : null;
}
