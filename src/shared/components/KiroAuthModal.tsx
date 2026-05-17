"use client";

import { useState, useEffect } from "react";
import {
  Building,
  CheckCircle2,
  CircleUser,
  Code as CodeIcon,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

export interface KiroIdcConfig {
  startUrl: string;
  region: string;
}

export interface KiroSocialConfig {
  provider: "google" | "github";
}

export type KiroAuthMethod = "builder-id" | "idc" | "social" | "import";

export interface KiroAuthModalProps {
  isOpen: boolean;
  onMethodSelect: (method: KiroAuthMethod, config?: KiroIdcConfig | KiroSocialConfig) => void;
  onClose: () => void;
}

interface AutoImportResponse {
  found?: boolean;
  refreshToken?: string;
  error?: string;
}

/**
 * Kiro Auth Method Selection Modal
 * Auto-detects token from AWS SSO cache or allows manual import
 */
export default function KiroAuthModal({ isOpen, onMethodSelect, onClose }: KiroAuthModalProps) {
  type LocalMethod = "idc" | "import" | "social-google" | "social-github" | null;
  const [selectedMethod, setSelectedMethod] = useState<LocalMethod>(null);
  const [idcStartUrl, setIdcStartUrl] = useState("");
  const [idcRegion, setIdcRegion] = useState("us-east-1");
  const [refreshToken, setRefreshToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  // Auto-detect token when import method is selected
  useEffect(() => {
    if (selectedMethod !== "import" || !isOpen) return;

    const autoDetect = async () => {
      setAutoDetecting(true);
      setError(null);
      setAutoDetected(false);

      try {
        const res = await fetch("/api/oauth/kiro/auto-import");
        const data = (await res.json()) as AutoImportResponse;

        if (data.found && data.refreshToken) {
          setRefreshToken(data.refreshToken);
          setAutoDetected(true);
        } else {
          setError(data.error || "Could not auto-detect token");
        }
      } catch {
        setError("Failed to auto-detect token");
      } finally {
        setAutoDetecting(false);
      }
    };

    autoDetect();
  }, [selectedMethod, isOpen]);

  const handleMethodSelect = (method: LocalMethod) => {
    setSelectedMethod(method);
    setError(null);
  };

  const handleBack = () => {
    setSelectedMethod(null);
    setError(null);
  };

  const handleImportToken = async () => {
    if (!refreshToken.trim()) {
      setError("Please enter a refresh token");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/oauth/kiro/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken.trim() }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      onMethodSelect("import");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleIdcContinue = () => {
    if (!idcStartUrl.trim()) {
      setError("Please enter your IDC start URL");
      return;
    }
    onMethodSelect("idc", { startUrl: idcStartUrl.trim(), region: idcRegion });
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    onMethodSelect("social", { provider });
  };

  return (
    <Modal isOpen={isOpen} title="Connect Kiro" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {!selectedMethod && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Choose your authentication method:
            </p>

            <button
              type="button"
              onClick={() => onMethodSelect("builder-id")}
              className="w-full p-4 text-left border border-[var(--bg-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-blue)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">AWS Builder ID</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Recommended for most users. Free AWS account required.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMethodSelect("idc")}
              className="w-full p-4 text-left border border-[var(--bg-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-[var(--accent-blue)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">AWS IAM Identity Center</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    For enterprise users with custom AWS IAM Identity Center.
                  </p>
                </div>
              </div>
            </button>

            {/* Google Social Login - HIDDEN */}
            <button
              type="button"
              onClick={() => handleMethodSelect("social-google")}
              className="hidden w-full p-4 text-left border border-[var(--bg-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <CircleUser className="h-5 w-5 text-[var(--accent-blue)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Google Account</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Login with your Google account (manual callback).
                  </p>
                </div>
              </div>
            </button>

            {/* GitHub Social Login - HIDDEN */}
            <button
              type="button"
              onClick={() => handleMethodSelect("social-github")}
              className="hidden w-full p-4 text-left border border-[var(--bg-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <CodeIcon className="h-5 w-5 text-[var(--accent-blue)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">GitHub Account</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Login with your GitHub account (manual callback).
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMethodSelect("import")}
              className="w-full p-4 text-left border border-[var(--bg-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-[var(--accent-blue)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Import Token</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Paste refresh token from Kiro IDE.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {selectedMethod === "idc" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                IDC Start URL <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                value={idcStartUrl}
                onChange={(e) => setIdcStartUrl(e.target.value)}
                placeholder="https://your-org.awsapps.com/start"
                inputClassName="font-mono text-sm"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Your organization&apos;s AWS IAM Identity Center URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">AWS Region</label>
              <Input
                value={idcRegion}
                onChange={(e) => setIdcRegion(e.target.value)}
                placeholder="us-east-1"
                inputClassName="font-mono text-sm"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                AWS region for your Identity Center (default: us-east-1)
              </p>
            </div>

            {error && <p className="text-sm text-[var(--accent-red)]">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleIdcContinue} fullWidth>
                Continue
              </Button>
              <Button onClick={handleBack} variant="ghost" fullWidth>
                Back
              </Button>
            </div>
          </div>
        )}

        {(selectedMethod === "social-google" || selectedMethod === "social-github") && (
          <div className="space-y-4">
            <div className="bg-[var(--accent-orange)]/10 p-4 rounded-[var(--radius-md)] border border-[var(--accent-orange)]/30">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-[var(--accent-orange)]" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-[var(--accent-orange)] mb-1">
                    Manual Callback Required
                  </p>
                  <p className="text-[var(--accent-orange)]/80">
                    After login, you&apos;ll need to copy the callback URL from your browser and paste it back here.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  handleSocialLogin(selectedMethod === "social-google" ? "google" : "github")
                }
                fullWidth
              >
                Continue with {selectedMethod === "social-google" ? "Google" : "GitHub"}
              </Button>
              <Button onClick={handleBack} variant="ghost" fullWidth>
                Back
              </Button>
            </div>
          </div>
        )}

        {selectedMethod === "import" && (
          <div className="space-y-4">
            {autoDetecting && (
              <div className="text-center py-6">
                <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-[var(--accent-blue)] animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Auto-detecting token...</h3>
                <p className="text-sm text-[var(--text-secondary)]">Reading from AWS SSO cache</p>
              </div>
            )}

            {!autoDetecting && (
              <>
                {autoDetected && (
                  <div className="bg-[var(--accent-green)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-green)]/30">
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)]" />
                      <p className="text-sm text-[var(--accent-green)]">
                        Token auto-detected from Kiro IDE successfully!
                      </p>
                    </div>
                  </div>
                )}

                {!autoDetected && !error && (
                  <div className="bg-[var(--accent-blue)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-blue)]/30">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-[var(--accent-blue)]" />
                      <p className="text-sm text-[var(--accent-blue)]">
                        Kiro IDE not detected. Please paste your refresh token manually.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Refresh Token <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <Input
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder="Token will be auto-filled..."
                    inputClassName="font-mono text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-[var(--accent-red)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-red)]/30">
                    <p className="text-sm text-[var(--accent-red)]">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleImportToken}
                    fullWidth
                    disabled={importing || !refreshToken.trim()}
                  >
                    {importing ? "Importing..." : "Import Token"}
                  </Button>
                  <Button onClick={handleBack} variant="ghost" fullWidth>
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
