"use client";

// Shared model picker — used by the Model inspector and every row of the
// Model Group inspector. When the user has connected providers it offers a
// dropdown of their /v1/models; otherwise it falls back to free text so a
// model id can always be entered manually.

import { useEffect, useState } from "react";
import { SelectInput, TextInput } from "./primitives";

type ApiModel = { id: string; owned_by?: string };

// Process-wide cache so opening the inspector for each model node/row doesn't
// re-request /v1/models every time.
let cachedModels: ApiModel[] | null = null;
let inflight: Promise<ApiModel[]> | null = null;

function fetchConnectedModels(): Promise<ApiModel[]> {
  if (cachedModels) return Promise.resolve(cachedModels);
  if (inflight) return inflight;
  inflight = fetch("/v1/models?connectedOnly=true")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const list = Array.isArray(data?.data) ? (data.data as ApiModel[]) : [];
      cachedModels = list;
      return list;
    })
    .catch(() => [] as ApiModel[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Hook: returns the connected-models list (null until the first fetch
// resolves), shared across all picker instances.
export function useConnectedModels(): ApiModel[] | null {
  const [available, setAvailable] = useState<ApiModel[] | null>(cachedModels);
  useEffect(() => {
    let cancelled = false;
    fetchConnectedModels().then((list) => {
      if (!cancelled) setAvailable(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

export function ModelPicker({
  value,
  onChange,
  placeholder = "claude-sonnet-4-6",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const available = useConnectedModels();

  if (available && available.length > 0) {
    return (
      <SelectInput
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Select a model…" },
          // Keep the currently-saved model even if it's no longer in
          // /v1/models (provider disabled etc.) so editing doesn't drop it.
          ...(value && !available.some((m) => m.id === value)
            ? [{ value, label: `${value} (not currently connected)` }]
            : []),
          ...available.map((m) => ({
            value: m.id,
            label: m.owned_by ? `${m.id}  ·  ${m.owned_by}` : m.id,
          })),
        ]}
      />
    );
  }
  return <TextInput value={value} onChange={onChange} placeholder={placeholder} mono />;
}
