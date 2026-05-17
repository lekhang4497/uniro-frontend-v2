"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export interface ManualConfigItem {
  filename: string;
  content: string;
}

export interface ManualConfigModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  configs?: ManualConfigItem[];
}

export default function ManualConfigModal({
  isOpen,
  onClose,
  title = "Manual Configuration",
  configs = [],
}: ManualConfigModalProps) {
  const { copy } = useCopyToClipboard();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyConfig = (text: string, index: number) => {
    copy(text, `manualconfig-${index}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="flex flex-col gap-4">
        {configs.map((config, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">{config.filename}</span>
              <Button variant="ghost" size="sm" onClick={() => copyConfig(config.content, index)}>
                {copiedIndex === index ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                {copiedIndex === index ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="px-3 py-2 bg-[var(--bg-secondary)] rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto border border-[var(--bg-secondary)]">
              {config.content}
            </pre>
          </div>
        ))}
      </div>
    </Modal>
  );
}
