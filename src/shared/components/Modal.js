"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import Button from "./Button";

const sizeMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  showCloseButton = true,
  className,
}) {
  return (
    <Dialog
      open={!!isOpen}
      onOpenChange={(open) => {
        if (!open && onClose) onClose();
      }}
    >
      <DialogContent
        className={cn("p-0 gap-0", sizeMap[size], className)}
        onInteractOutside={closeOnOverlay ? undefined : (e) => e.preventDefault()}
        onPointerDownOutside={closeOnOverlay ? undefined : (e) => e.preventDefault()}
      >
        {title && (
          <DialogHeader className="flex flex-row items-center gap-2 p-4 border-b border-border space-y-0">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </DialogHeader>
        )}

        <div className="p-6 max-h-[calc(85vh-100px)] overflow-y-auto custom-scrollbar">{children}</div>

        {footer && (
          <DialogFooter className="flex items-center justify-end gap-3 p-6 border-t border-border">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground">{message}</p>
    </Modal>
  );
}
