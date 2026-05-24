// Thin HTTP client for the UniRo Management Service.
//
// All server-to-mgmt calls go through here. The mgmt service holds the
// Supabase service-role key and the gateway secret — neither of those
// belongs on the frontend.
//
// Two entry points:
//   - resolveSessionViaMgmt(apiKey)       — gateway-side, used per request
//   - resolveRouterViaMgmt(apiKey, id)    — gateway-side router override
// Plus mintChatKeyViaMgmt() / etc. that take a Supabase user JWT.

function mgmtBaseUrl() {
  return process.env.UNIRO_MGMT_URL || "http://127.0.0.1:8859";
}

async function jsonOrThrow(res, label) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`${label}: HTTP ${res.status} ${text ? `— ${text}` : ""}`);
    err.code = res.status === 401 ? "UNAUTHORIZED" : "MGMT_ERROR";
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function resolveSessionViaMgmt(apiKey) {
  const res = await fetch(`${mgmtBaseUrl()}/v1/resolve-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return jsonOrThrow(res, "mgmt resolve-session");
}

export async function resolveRouterViaMgmt(apiKey, routerId) {
  const res = await fetch(`${mgmtBaseUrl()}/v1/resolve-router`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, router_id: routerId }),
  });
  return jsonOrThrow(res, "mgmt resolve-router");
}

// `userJwt` here is the Supabase access token read from the cookie session.
// `currentPlaintext` is the value of the existing uniro_chat_key cookie (if
// any). Mgmt uses it to skip rotation when the caller's cookie is still
// valid — without this, React StrictMode firing the chat-page effect twice
// would create duplicate rows and leave the browser holding a stale plaintext.
export async function mintChatKeyViaMgmt(userJwt, currentPlaintext = "") {
  const res = await fetch(`${mgmtBaseUrl()}/v1/chat-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userJwt}`,
    },
    body: JSON.stringify({ current_plaintext: currentPlaintext }),
  });
  return jsonOrThrow(res, "mgmt chat-key");
}
