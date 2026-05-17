"use client";

import { useState } from "react";

const CUSTOM_VALUE = "__custom__";

type ApiKey = {
  id: string | number;
  key: string;
};

type Props = {
  value: string;
  onChange: (val: string) => void;
  apiKeys?: ApiKey[];
  cloudEnabled?: boolean;
  className?: string;
};

export default function ApiKeySelect({ value, onChange, apiKeys = [], cloudEnabled = false, className = "" }: Props) {
  const isCustom = !apiKeys.some((k) => k.key === value) && value !== "";
  const [mode, setMode] = useState<string>(() => {
    if (!value) return apiKeys.length > 0 && apiKeys[0] ? apiKeys[0].key : CUSTOM_VALUE;
    if (apiKeys.some((k) => k.key === value)) return value;
    return CUSTOM_VALUE;
  });
  const [customInput, setCustomInput] = useState<string>(isCustom ? value : "");

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setMode(next);
    if (next === CUSTOM_VALUE) {
      setCustomInput("");
      onChange("");
    } else {
      onChange(next);
    }
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCustomInput(v);
    onChange(v);
  };

  const noKeys = apiKeys.length === 0 && mode !== CUSTOM_VALUE;

  if (noKeys && mode !== CUSTOM_VALUE) {
    return (
      <span className={`min-w-0 rounded bg-[var(--bg-elevated)]/40 px-2 py-2 text-xs text-[var(--text-secondary)] sm:py-1.5 ${className}`}>
        {cloudEnabled ? "No API keys - Create one in Keys page" : "sk_uniro (default)"}
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <select
        value={mode}
        onChange={handleSelect}
        className="w-full min-w-0 px-2 py-2 bg-[var(--bg-elevated)] rounded text-xs border border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-orange)]/50 sm:py-1.5"
      >
        {apiKeys.map((k) => (
          <option key={k.id} value={k.key}>{k.key}</option>
        ))}
        <option value={CUSTOM_VALUE}>Custom...</option>
      </select>
      {mode === CUSTOM_VALUE && (
        <input
          type="text"
          value={customInput}
          onChange={handleCustomInput}
          placeholder="sk-..."
          className="w-full min-w-0 px-2 py-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-default)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent-orange)]/50 sm:py-1.5"
        />
      )}
    </div>
  );
}
