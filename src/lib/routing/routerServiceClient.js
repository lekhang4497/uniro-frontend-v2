// HTTP client for the Python Router Service. Stateless: takes the request +
// the router config + the service token minted by `session-resolve`, returns
// {model, plugins_applied, modified_request, trace}.

export async function routeViaService({ baseUrl, serviceToken, request, router }) {
  if (!baseUrl) throw new Error("router_service_base_url_missing");
  if (!serviceToken) throw new Error("router_service_token_missing");
  if (!router?.config_yaml) throw new Error("router_config_missing");

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify({
      request,
      router: {
        id: router.id,
        version: router.version,
        engine: router.engine,
        config_yaml: router.config_yaml,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`router_service_error: ${res.status} ${text}`);
    err.code = "ROUTER_SERVICE_ERROR";
    throw err;
  }

  return res.json();
}
