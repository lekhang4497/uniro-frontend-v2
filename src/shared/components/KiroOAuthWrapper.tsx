"use client";

import { useState, useCallback } from "react";
import OAuthModal from "./OAuthModal";
import KiroAuthModal, {
  type KiroAuthMethod,
  type KiroIdcConfig,
  type KiroSocialConfig,
} from "./KiroAuthModal";
import KiroSocialOAuthModal from "./KiroSocialOAuthModal";

export interface KiroProviderInfo {
  name?: string;
}

export interface KiroOAuthWrapperProps {
  isOpen: boolean;
  providerInfo?: KiroProviderInfo;
  onSuccess?: () => void;
  onClose: () => void;
}

type AuthState = null | "builder-id" | "idc" | "social";

/**
 * Kiro OAuth Wrapper
 * Orchestrates between method selection, device code flow, and social login flow
 */
export default function KiroOAuthWrapper({
  isOpen,
  providerInfo,
  onSuccess,
  onClose,
}: KiroOAuthWrapperProps) {
  const [authMethod, setAuthMethod] = useState<AuthState>(null);
  const [socialProvider, setSocialProvider] = useState<"google" | "github" | null>(null);
  const [idcConfig, setIdcConfig] = useState<KiroIdcConfig | null>(null);

  const handleMethodSelect = useCallback(
    (method: KiroAuthMethod, config?: KiroIdcConfig | KiroSocialConfig) => {
      if (method === "builder-id") {
        setAuthMethod("builder-id");
      } else if (method === "idc") {
        setAuthMethod("idc");
        if (config && "startUrl" in config) setIdcConfig(config);
      } else if (method === "social") {
        setAuthMethod("social");
        if (config && "provider" in config) setSocialProvider(config.provider);
      } else if (method === "import") {
        onSuccess?.();
      }
    },
    [onSuccess]
  );

  const handleBack = () => {
    setAuthMethod(null);
    setSocialProvider(null);
    setIdcConfig(null);
  };

  const handleSocialSuccess = () => {
    setAuthMethod(null);
    setSocialProvider(null);
    onSuccess?.();
    onClose?.();
  };

  const handleDeviceSuccess = () => {
    setAuthMethod(null);
    setIdcConfig(null);
    onSuccess?.();
    onClose?.();
  };

  if (!authMethod) {
    return <KiroAuthModal isOpen={isOpen} onMethodSelect={handleMethodSelect} onClose={onClose} />;
  }

  if (authMethod === "builder-id" || authMethod === "idc") {
    return (
      <OAuthModal
        isOpen={isOpen}
        provider="kiro"
        providerInfo={providerInfo}
        onSuccess={handleDeviceSuccess}
        onClose={handleBack}
        idcConfig={idcConfig}
      />
    );
  }

  if (authMethod === "social" && socialProvider) {
    return (
      <KiroSocialOAuthModal
        isOpen={isOpen}
        provider={socialProvider}
        onSuccess={handleSocialSuccess}
        onClose={handleBack}
      />
    );
  }

  return null;
}
