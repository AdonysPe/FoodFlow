type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: string; code?: string };
export type AuthApiResult<T> = ApiSuccess<T> | ApiFailure;

let csrfTokenPromise: Promise<string> | null = null;

async function csrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("csrf");
        const body = (await response.json()) as { token?: string };
        if (!body.token) throw new Error("csrf");
        return body.token;
      })
      .catch((error) => {
        csrfTokenPromise = null;
        throw error;
      });
  }
  return csrfTokenPromise;
}

export async function postAuth<T>(
  path: string,
  body: Record<string, string>
): Promise<AuthApiResult<T>> {
  const token = await csrfToken();
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": token,
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as AuthApiResult<T>;
  if (response.status === 403 && !result.ok && result.code === "csrf_failed") {
    csrfTokenPromise = null;
  }
  return result;
}
