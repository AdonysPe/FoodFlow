// Culqi adapter for SubscriptionProviderAdapter.
//
// Endpoints and fields follow Culqi's official SDKs (culqi-go, culqi-php) and
// docs.culqi.com; the ones that matter:
//
//   GET  /v2/recurrent/plans/{id}           read a plan (price check)
//   POST /v2/customers                      first_name, last_name, email,
//                                           address, address_city,
//                                           country_code, phone_number
//   GET  /v2/customers?email=               find an existing customer
//   POST /v2/cards                          customer_id, token_id
//                                           (+ authentication_3DS on retry)
//                                           → 201 saved, 200 + action_code
//                                             "REVIEW" = 3-D Secure needed
//   POST /v2/recurrent/subscriptions/create card_id, plan_id, tyc
//   GET  /v2/recurrent/subscriptions/{id}   read a subscription
//   GET  /v2/recurrent/subscriptions?plan_id= list (lost-response recovery)
//   DELETE /v2/recurrent/subscriptions/{id} cancel — immediate, irreversible
//   PATCH /v2/recurrent/subscriptions/{id} change the card (card_id)
//   GET  /v2/charges/{id}                   one charge, to verify its outcome
//   GET  /v2/events/{id}                    the event as Culqi stored it
//
// The card itself never passes through here: the browser tokenizes it in
// Culqi Checkout and we only ever see the single-use `tkn_…` id.
//
// NOTHING SECRET IN LOGS OR ERRORS. Messages carry the operation and the
// status, never the key, the token or the request body.
//
// Server only.

import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type PlanCheck,
  type SaveCardResult,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
import {
  asRecord,
  chargeFacts,
  chargeOutcome,
  normalizeSubscription,
  providerDate,
  str,
} from "@/lib/subscriptions/events";

const BASE_URL = "https://api.culqi.com/v2";
const TIMEOUT_MS = 15_000;

type CulqiBody = Record<string, unknown>;

type CulqiResponse = { status: number; body: CulqiBody };

const idPath = (id: string) => encodeURIComponent(id);

export function createCulqiAdapter(
  secretKey: string,
  fetchImpl: typeof fetch = fetch
): SubscriptionProviderAdapter {
  async function call(
    operation: string,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: CulqiBody
  ): Promise<CulqiResponse> {
    let response: Response;
    try {
      response = await fetchImpl(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new ProviderUnavailableError(`Culqi ${operation}: sin respuesta`, operation);
    }

    const parsed = asRecord(await response.json().catch(() => null));
    if (response.status >= 500) {
      throw new ProviderUnavailableError(`Culqi ${operation}: HTTP ${response.status}`, operation);
    }
    return { status: response.status, body: parsed };
  }

  function rejected(operation: string, res: CulqiResponse): ProviderRejectedError {
    return new ProviderRejectedError(
      `Culqi ${operation}: HTTP ${res.status} ${str(res.body.type) ?? ""}`.trim(),
      operation,
      res.status,
      // A card refusal is flagged as such whatever its detailed code, so the
      // service can tell "try another card" from "our request was wrong".
      res.status === 402 || res.body.type === "card_error"
        ? "card_error"
        : (str(res.body.code) ?? str(res.body.type))
    );
  }

  async function getSubscription(subscriptionId: string) {
    const res = await call(
      "subscription.get",
      "GET",
      `/recurrent/subscriptions/${idPath(subscriptionId)}`
    );
    if (res.status === 404) return null;
    if (res.status !== 200) throw rejected("subscription.get", res);
    return normalizeSubscription(res.body);
  }

  return {
    id: "culqi",

    async getPlan(planId): Promise<PlanCheck> {
      const res = await call("plan.get", "GET", `/recurrent/plans/${encodeURIComponent(planId)}`);
      if (res.status !== 200) throw rejected("plan.get", res);
      const amount = res.body.amount;
      const cycles = asRecord(res.body.initial_cycles);
      const hasInitialCharge = cycles.has_initial_charge;
      const count = cycles.count;
      return {
        amountCents: typeof amount === "number" ? amount : Number.NaN,
        currency: str(res.body.currency) ?? "",
        hasFreeInitialCycles:
          typeof hasInitialCharge === "boolean" && typeof count === "number"
            ? !hasInitialCharge && count > 0
            : null,
      };
    },

    async ensureCustomer(input) {
      const payload = {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        address: input.address,
        address_city: input.city,
        country_code: "PE",
        phone_number: input.phone,
        metadata: input.metadata,
      };
      const created = await call("customer.create", "POST", "/customers", payload);
      const createdId = str(created.body.id);
      if ((created.status === 200 || created.status === 201) && createdId) {
        return { customerId: createdId };
      }

      // Culqi keeps one customer per email. An owner with a second venue, or
      // a retried checkout, already has one: reuse it instead of failing.
      const found = await call(
        "customer.find",
        "GET",
        `/customers?email=${encodeURIComponent(input.email)}`
      );
      const list = Array.isArray(found.body.data) ? found.body.data : [];
      const match = list
        .map(asRecord)
        .find((customer) => str(customer.email)?.toLowerCase() === input.email.toLowerCase());
      const matchId = match ? str(match.id) : null;
      if (matchId) return { customerId: matchId };
      throw rejected("customer.create", created);
    },

    async saveCard(input): Promise<SaveCardResult> {
      const payload: CulqiBody = {
        customer_id: input.customerId,
        token_id: input.tokenId,
        metadata: input.metadata,
      };
      // Culqi: the first call goes without 3DS parameters; only the retry
      // after Culqi3DS carries them.
      if (input.authentication3DS) payload.authentication_3DS = input.authentication3DS;

      const res = await call("card.create", "POST", "/cards", payload);

      if (res.status === 201 && str(res.body.id)) {
        const source = asRecord(res.body.source);
        const iin = asRecord(source.iin);
        const lastFour = str(source.last_four) ?? str(source.card_number)?.slice(-4) ?? null;
        return {
          kind: "saved",
          cardId: str(res.body.id)!,
          brand: str(iin.card_brand),
          last4: lastFour && /^\d{4}$/.test(lastFour) ? lastFour : null,
        };
      }
      if (res.status === 200 && res.body.action_code === "REVIEW") {
        return { kind: "requires_3ds" };
      }
      if (res.status === 402 || res.body.type === "card_error") {
        return {
          kind: "declined",
          code: str(res.body.decline_code) ?? str(res.body.code),
          userMessage: str(res.body.user_message),
        };
      }
      throw rejected("card.create", res);
    },

    async createSubscription(input) {
      const res = await call("subscription.create", "POST", "/recurrent/subscriptions/create", {
        card_id: input.cardId,
        plan_id: input.planId,
        tyc: true,
        metadata: input.metadata,
      });
      const id = str(res.body.id);
      if ((res.status === 200 || res.status === 201) && id?.startsWith("sxn_")) {
        const status = res.body.status;
        return {
          subscriptionId: id,
          rawStatus: typeof status === "number" || typeof status === "string" ? String(status) : null,
        };
      }
      throw rejected("subscription.create", res);
    },

    async getEvent(eventId) {
      const res = await call("event.get", "GET", `/events/${idPath(eventId)}`);
      if (res.status === 404) return null;
      if (res.status !== 200) throw rejected("event.get", res);
      const id = str(res.body.id);
      const type = str(res.body.type);
      if (!id || !type) return null;
      return {
        id,
        type,
        createdAt: providerDate(res.body.creation_date),
        data: asRecord(res.body.data),
      };
    },

    getSubscription,

    async getCharge(chargeId) {
      const res = await call("charge.get", "GET", `/charges/${idPath(chargeId)}`);
      if (res.status === 404) return null;
      if (res.status !== 200) throw rejected("charge.get", res);
      const facts = chargeFacts(res.body);
      if (!facts) return null;
      return { facts, outcome: chargeOutcome(res.body) };
    },

    async updateSubscriptionCard(subscriptionId, cardId) {
      const res = await call(
        "subscription.update_card",
        "PATCH",
        `/recurrent/subscriptions/${idPath(subscriptionId)}`,
        { card_id: cardId }
      );
      if (res.status !== 200) throw rejected("subscription.update_card", res);
    },

    async cancelSubscription(subscriptionId) {
      const res = await call(
        "subscription.cancel",
        "DELETE",
        `/recurrent/subscriptions/${idPath(subscriptionId)}`
      );
      if (res.status === 200 || res.status === 204) return "canceled";
      // Already gone or already cancelled: confirm it before calling it done.
      if (res.status === 404 || res.status === 400) {
        const current = await getSubscription(subscriptionId);
        if (!current || current.status === "canceled") return "already_canceled";
      }
      throw rejected("subscription.cancel", res);
    },

    async findSubscription({ planId, cardId, createdAfter }) {
      const res = await call(
        "subscription.list",
        "GET",
        // The plan is shared by every customer, so the list grows without
        // bound: narrow it to what was created since this attempt began.
        `/recurrent/subscriptions?plan_id=${idPath(planId)}&creation_date_from=${createdAfter.getTime() - 5 * 60 * 1000}&limit=100`
      );
      if (res.status !== 200) throw rejected("subscription.list", res);
      const list = Array.isArray(res.body.data) ? res.body.data : [];
      const earliest = createdAfter.getTime() - 5 * 60 * 1000;
      return (
        list
          .map((item) => normalizeSubscription(asRecord(item)))
          .find(
            (sub) =>
              sub != null &&
              sub.cardId === cardId &&
              (sub.createdAt == null || sub.createdAt.getTime() >= earliest)
          ) ?? null
      );
    },
  };
}
