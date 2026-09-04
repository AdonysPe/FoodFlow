// The OSE/PSE providers a Peruvian venue can contract, and what FoodFlow needs
// from each one to talk to it.
//
// FoodFlow does not resell any of these: the restaurant opens its own account,
// pays the provider directly, and pastes the credentials here. That is why the
// catalogue carries a price *hint* and a signup link rather than a plan — the
// number is the provider's public list price and belongs to them, not to us.
//
// Pure data, imported by both the settings form and the server actions.

export const OSE_PROVIDERS = [
  "nubefact",
  "facturador_pro",
  "huascar",
  "confact",
  "otro",
] as const;

export type OseProvider = (typeof OSE_PROVIDERS)[number];

export type OseProviderMeta = {
  label: string;
  /** Where the owner opens the account. */
  site: string;
  /** Shown under the API key field so the owner knows where to find it. */
  credentialHint: string;
  /**
   * Whether the account has its own base URL. Nubefact hands each taxpayer a
   * distinct endpoint, so a constant would be wrong for everyone but one venue.
   */
  needsEndpoint: boolean;
  /** Some providers issue a key/secret pair, others a single token. */
  needsSecret: boolean;
  /** Provider's own published starting price, in soles per month. */
  fromPriceSoles: number | null;
};

export const OSE_PROVIDER_META: Record<OseProvider, OseProviderMeta> = {
  nubefact: {
    label: "Nubefact",
    site: "https://www.nubefact.com",
    credentialHint:
      "En Nubefact: Configuración → API. Copia la URL de tu cuenta y el token.",
    needsEndpoint: true,
    needsSecret: false,
    fromPriceSoles: 70,
  },
  facturador_pro: {
    label: "Facturador.pro",
    site: "https://www.facturador.pro",
    credentialHint: "En tu panel: Configuración → Integraciones → API.",
    needsEndpoint: true,
    needsSecret: false,
    fromPriceSoles: null,
  },
  huascar: {
    label: "Huáscar",
    site: "https://huascar.pe",
    credentialHint: "Pide a tu proveedor la URL del servicio y las credenciales.",
    needsEndpoint: true,
    needsSecret: true,
    fromPriceSoles: null,
  },
  confact: {
    label: "Confact",
    site: "https://confact.pe",
    credentialHint: "Pide a tu proveedor la URL del servicio y las credenciales.",
    needsEndpoint: true,
    needsSecret: true,
    fromPriceSoles: null,
  },
  otro: {
    label: "Otro proveedor",
    site: "",
    credentialHint:
      "Pega la URL del servicio y la credencial que te dio tu OSE. Si usa clave y secreto, llena ambos.",
    needsEndpoint: true,
    needsSecret: true,
    fromPriceSoles: null,
  },
};

export function isOseProvider(value: unknown): value is OseProvider {
  return typeof value === "string" && (OSE_PROVIDERS as readonly string[]).includes(value);
}
