"use client";

import { useState, useMemo, useEffect } from "react";
import { CheckCircle2, Edit, Layers, Search, SearchX } from "lucide-react";
import Modal from "./Modal";
import { getModelsByProviderId } from "@/shared/constants/models";
import {
  OAUTH_PROVIDERS,
  APIKEY_PROVIDERS,
  FREE_PROVIDERS,
  FREE_TIER_PROVIDERS,
  AI_PROVIDERS,
  isOpenAICompatibleProvider,
  isAnthropicCompatibleProvider,
  getProviderAlias,
} from "@/shared/constants/providers";

// Provider order: OAuth first, then Free Tier, then API Key
const PROVIDER_ORDER: string[] = [
  ...Object.keys(OAUTH_PROVIDERS),
  ...Object.keys(FREE_PROVIDERS),
  ...Object.keys(FREE_TIER_PROVIDERS),
  ...Object.keys(APIKEY_PROVIDERS),
];

const NO_AUTH_PROVIDER_IDS: string[] = Object.keys(FREE_PROVIDERS).filter(
   
  (id) => (FREE_PROVIDERS as Record<string, any>)[id]?.noAuth
);

export interface ModelItem {
  id: string;
  name: string;
  value: string;
  type?: string;
  isCustom?: boolean;
  isPlaceholder?: boolean;
}

export interface ActiveProviderRef {
  provider: string;
  name?: string;
  providerSpecificData?: { prefix?: string };
}

interface Combo {
  id?: string;
  name: string;
}

interface ProviderNode {
  id: string;
  name?: string;
  prefix?: string;
}

interface CustomModel {
  id: string;
  name?: string;
  providerAlias?: string;
}

interface ModelGroup {
  name: string;
  alias?: string;
  color?: string;
  models: ModelItem[];
  isCustom?: boolean;
  hasModels?: boolean;
}

export interface ModelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: ModelItem) => void;
  onDeselect?: (model: ModelItem) => void;
  selectedModel?: string;
  activeProviders?: ActiveProviderRef[];
  title?: string;
  modelAliases?: Record<string, string>;
  kindFilter?: string | null;
  addedModelValues?: string[];
  closeOnSelect?: boolean;
}

export default function ModelSelectModal({
  isOpen,
  onClose,
  onSelect,
  onDeselect,
  selectedModel,
  activeProviders = [],
  title = "Select Model",
  modelAliases = {},
  kindFilter = null,
  addedModelValues = [],
  closeOnSelect = true,
}: ModelSelectModalProps) {
  const filteredActiveProviders = useMemo(() => {
    if (!kindFilter) return activeProviders;
    return activeProviders.filter((p) => {
       
      const info = (AI_PROVIDERS as Record<string, any>)[p.provider];
      const kinds: string[] = info?.serviceKinds || ["llm"];
      return kinds.includes(kindFilter);
    });
  }, [activeProviders, kindFilter]);

  const [searchQuery, setSearchQuery] = useState("");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [providerNodes, setProviderNodes] = useState<ProviderNode[]>([]);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [disabledModels, setDisabledModels] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/combos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCombos(d?.combos || []))
      .catch(() => setCombos([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/provider-nodes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProviderNodes(d?.nodes || []))
      .catch(() => setProviderNodes([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/models/custom")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCustomModels(d?.models || []))
      .catch(() => setCustomModels([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/models/disabled")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDisabledModels(d?.disabled || {}))
      .catch(() => setDisabledModels({}));
  }, [isOpen]);

   
  const allProviders = useMemo<Record<string, any>>(
    () => ({ ...OAUTH_PROVIDERS, ...FREE_PROVIDERS, ...FREE_TIER_PROVIDERS, ...APIKEY_PROVIDERS }),
    []
  );

  // Group models by provider
  const groupedModels = useMemo<Record<string, ModelGroup>>(() => {
    const groups: Record<string, ModelGroup> = {};
    const PROVIDER_AS_MODEL_KINDS = new Set(["webSearch", "webFetch"]);
    const TYPED_KINDS = new Set(["image", "tts", "stt", "embedding", "imageToText"]);
    const ALLOW_PROVIDER_FALLBACK_KINDS = new Set(["tts", "image", "webFetch"]);

    const filterByKind = (models: ModelItem[]) => {
      if (!kindFilter) return models.filter((m) => m.isPlaceholder || !m.type || m.type === "llm");
      if (!TYPED_KINDS.has(kindFilter)) return models;
      return models.filter((m) => m.isPlaceholder || m.type === kindFilter);
    };

    const activeConnectionIds = filteredActiveProviders.map((p) => p.provider);

    const noAuthIds = kindFilter
      ? NO_AUTH_PROVIDER_IDS.filter((id) =>
           
          ((AI_PROVIDERS as Record<string, any>)[id]?.serviceKinds || ["llm"]).includes(kindFilter)
        )
      : NO_AUTH_PROVIDER_IDS;

    const providerIdsToShow = new Set([...activeConnectionIds, ...noAuthIds]);

    const sortedProviderIds = [...providerIdsToShow].sort((a, b) => {
      const indexA = PROVIDER_ORDER.indexOf(a);
      const indexB = PROVIDER_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    sortedProviderIds.forEach((providerId) => {
      const alias = getProviderAlias(providerId);
      const providerInfo = allProviders[providerId] || { name: providerId, color: "#666" };
      const isCustomProvider =
        isOpenAICompatibleProvider(providerId) || isAnthropicCompatibleProvider(providerId);

      if (kindFilter && PROVIDER_AS_MODEL_KINDS.has(kindFilter)) {
        groups[providerId] = {
          name: providerInfo.name,
          alias,
          color: providerInfo.color,
          models: [{ id: providerId, name: providerInfo.name, value: providerId }],
        };
        return;
      }

      if (providerInfo.passthroughModels) {
        const aliasModels: ModelItem[] = Object.entries(modelAliases)
          .filter(([, fullModel]) => fullModel.startsWith(`${alias}/`))
          .map(([aliasName, fullModel]) => ({
            id: fullModel.replace(`${alias}/`, ""),
            name: aliasName,
            value: fullModel,
          }));

        let combined: ModelItem[] = aliasModels;
        if (kindFilter && TYPED_KINDS.has(kindFilter)) {
          combined = getModelsByProviderId(providerId)
             
            .filter((m: any) => m.type === kindFilter)
             
            .map((m: any) => ({ id: m.id, name: m.name, value: `${alias}/${m.id}`, type: m.type }));
          if (combined.length === 0 && ALLOW_PROVIDER_FALLBACK_KINDS.has(kindFilter)) {
            const supports = (providerInfo.serviceKinds || ["llm"]).includes(kindFilter);
            if (supports) combined = [{ id: providerId, name: providerInfo.name, value: alias }];
          }
        }

        if (combined.length > 0) {
          const matchedNode = providerNodes.find((node) => node.id === providerId);
          const displayName = matchedNode?.name || providerInfo.name;

          groups[providerId] = {
            name: displayName,
            alias,
            color: providerInfo.color,
            models: combined,
          };
        }
      } else if (isCustomProvider) {
        if (kindFilter && TYPED_KINDS.has(kindFilter)) return;
        const connection = activeProviders.find((p) => p.provider === providerId);
        const matchedNode = providerNodes.find((node) => node.id === providerId);
        const displayName = connection?.name || matchedNode?.name || providerInfo.name;
        const nodePrefix =
          connection?.providerSpecificData?.prefix || matchedNode?.prefix || providerId;

        const nodeModels: ModelItem[] = Object.entries(modelAliases)
          .filter(([, fullModel]) => fullModel.startsWith(`${providerId}/`))
          .map(([aliasName, fullModel]) => ({
            id: fullModel.replace(`${providerId}/`, ""),
            name: aliasName,
            value: `${nodePrefix}/${fullModel.replace(`${providerId}/`, "")}`,
          }));

        const modelsToShow: ModelItem[] =
          nodeModels.length > 0
            ? nodeModels
            : [
                {
                  id: `__placeholder__${providerId}`,
                  name: `${nodePrefix}/model-id`,
                  value: `${nodePrefix}/model-id`,
                  isPlaceholder: true,
                },
              ];

        groups[providerId] = {
          name: displayName,
          alias: nodePrefix,
          color: providerInfo.color,
          models: modelsToShow,
          isCustom: true,
          hasModels: nodeModels.length > 0,
        };
      } else {
         
        const hardcodedModels = getModelsByProviderId(providerId) as any[];
        const hardcodedIds = new Set(hardcodedModels.map((m) => m.id));

        const hasHardcoded = hardcodedModels.length > 0;
        const customAliasModels: ModelItem[] = Object.entries(modelAliases)
          .filter(
            ([aliasName, fullModel]) =>
              fullModel.startsWith(`${alias}/`) &&
              (hasHardcoded ? aliasName === fullModel.replace(`${alias}/`, "") : true) &&
              !hardcodedIds.has(fullModel.replace(`${alias}/`, ""))
          )
          .map(([aliasName, fullModel]) => {
            const modelId = fullModel.replace(`${alias}/`, "");
            return { id: modelId, name: aliasName, value: fullModel, isCustom: true };
          });

        const customAliasIds = new Set(customAliasModels.map((m) => m.id));
        const customRegisteredModels: ModelItem[] = customModels
          .filter(
            (m) =>
              m.providerAlias === alias &&
              !hardcodedIds.has(m.id) &&
              !customAliasIds.has(m.id)
          )
          .map((m) => ({
            id: m.id,
            name: m.name || m.id,
            value: `${alias}/${m.id}`,
            isCustom: true,
          }));

        const merged: ModelItem[] = [
          ...hardcodedModels.map((m) => ({
            id: m.id,
            name: m.name,
            value: `${alias}/${m.id}`,
            type: m.type,
          })),
          ...customAliasModels,
          ...customRegisteredModels,
        ];
        const seen = new Set<string>();
        let allModels = filterByKind(
          merged.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
          })
        );

        if (allModels.length === 0 && kindFilter && ALLOW_PROVIDER_FALLBACK_KINDS.has(kindFilter)) {
          const supports = (providerInfo.serviceKinds || ["llm"]).includes(kindFilter);
          if (supports) {
            allModels = [{ id: providerId, name: providerInfo.name, value: alias }];
          }
        }

        if (allModels.length > 0) {
          groups[providerId] = {
            name: providerInfo.name,
            alias,
            color: providerInfo.color,
            models: allModels,
          };
        }
      }
    });

    Object.entries(groups).forEach(([providerId, group]) => {
      const aliasKey = getProviderAlias(providerId);
      const disabledIds = new Set([
        ...(disabledModels[aliasKey] || []),
        ...(disabledModels[providerId] || []),
      ]);
      if (disabledIds.size === 0) return;
      group.models = group.models.filter((m) => !disabledIds.has(m.id));
      if (group.models.length === 0) delete groups[providerId];
    });

    return groups;
  }, [
    filteredActiveProviders,
    modelAliases,
    allProviders,
    providerNodes,
    customModels,
    disabledModels,
    kindFilter,
    activeProviders,
  ]);

  const filteredCombos = useMemo<Combo[]>(() => {
    if (kindFilter) return [];
    if (!searchQuery.trim()) return combos;
    const query = searchQuery.toLowerCase();
    return combos.filter((c) => c.name.toLowerCase().includes(query));
  }, [combos, searchQuery, kindFilter]);

  const filteredGroups = useMemo<Record<string, ModelGroup>>(() => {
    if (!searchQuery.trim()) return groupedModels;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, ModelGroup> = {};

    Object.entries(groupedModels).forEach(([providerId, group]) => {
      const matchedModels = group.models.filter(
        (m) =>
          m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
      );

      const providerNameMatches = group.name.toLowerCase().includes(query);

      if (matchedModels.length > 0 || providerNameMatches) {
        filtered[providerId] = {
          ...group,
          models: matchedModels,
        };
      }
    });

    return filtered;
  }, [groupedModels, searchQuery]);

  const handleSelect = (model: ModelItem) => {
    const value = model.value || model.name;
    const isAdded = addedModelValues.includes(value);

    if (isAdded && onDeselect) {
      onDeselect(model);
    } else {
      onSelect(model);
    }

    if (closeOnSelect) {
      onClose();
      setSearchQuery("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSearchQuery("");
      }}
      title={title}
      size="md"
      className="p-4!"
    >
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] h-4 w-4" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded text-xs text-[var(--text-primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)]"
          />
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-3">
        {filteredCombos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 sticky top-0 bg-[var(--bg-primary)] py-0.5">
              <Layers className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
              <span className="text-xs font-medium text-[var(--accent-blue)]">Combos</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                ({filteredCombos.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredCombos.map((combo) => {
                const isSelected = selectedModel === combo.name;
                const isAdded = addedModelValues.includes(combo.name);
                return (
                  <button
                    type="button"
                    key={combo.id ?? combo.name}
                    onClick={() =>
                      handleSelect({ id: combo.name, name: combo.name, value: combo.name })
                    }
                    className={`px-2 py-1 rounded-xl text-xs font-medium transition-colors border hover:cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-[var(--accent-blue)] text-[var(--text-inverted)] border-[var(--accent-blue)]"
                        : isAdded
                          ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                          : "bg-[var(--bg-primary)] border-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/5"
                    }`}
                  >
                    {isAdded && <CheckCircle2 className="h-3 w-3" />}
                    {combo.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(filteredGroups).map(([providerId, group]) => (
          <div key={providerId}>
            <div className="flex items-center gap-1.5 mb-1.5 sticky top-0 bg-[var(--bg-primary)] py-0.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-xs font-medium text-[var(--accent-blue)]">{group.name}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                ({group.models.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.models.map((model) => {
                const isSelected = selectedModel === model.value;
                const isPlaceholder = model.isPlaceholder;
                return (
                  <button
                    type="button"
                    key={model.value}
                    onClick={() => handleSelect(model)}
                    title={
                      isPlaceholder
                        ? "Select to pre-fill, then edit model ID in the input"
                        : undefined
                    }
                    className={`px-2 py-1 rounded-xl text-xs font-medium transition-colors border hover:cursor-pointer ${
                      isPlaceholder
                        ? "border-dashed border-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]/50 hover:text-[var(--accent-blue)] bg-[var(--bg-primary)] italic"
                        : isSelected
                          ? "bg-[var(--accent-blue)] text-[var(--text-inverted)] border-[var(--accent-blue)]"
                          : addedModelValues.includes(model.value)
                            ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                            : "bg-[var(--bg-primary)] border-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/5"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {addedModelValues.includes(model.value) && !isPlaceholder && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {isPlaceholder ? (
                        <>
                          <Edit className="h-3 w-3" />
                          {model.name}
                        </>
                      ) : model.isCustom ? (
                        <>
                          {model.name}
                          <span className="text-[9px] opacity-60 font-normal">custom</span>
                        </>
                      ) : (
                        model.name
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(filteredGroups).length === 0 && filteredCombos.length === 0 && (
          <div className="text-center py-4 text-[var(--text-secondary)]">
            <SearchX className="h-6 w-6 mx-auto mb-1" />
            <p className="text-xs">No models found</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
