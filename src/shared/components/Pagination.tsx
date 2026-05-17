"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const showMax = 5;

    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + showMax - 1);

    if (end - start + 1 < showMax) {
      start = Math.max(1, end - showMax + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4",
        className
      )}
    >
      {/* Info text */}
      {totalItems > 0 && (
        <div className="text-sm text-[var(--text-secondary)]">
          Showing <span className="font-medium text-[var(--text-primary)]">{startItem}</span> to{" "}
          <span className="font-medium text-[var(--text-primary)]">{endItem}</span> of{" "}
          <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> results
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                "h-9 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]",
                "text-sm text-[var(--text-primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)]",
                "cursor-pointer"
              )}
              style={{ colorScheme: "auto" }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 px-0"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </Button>

            {pageNumbers[0] !== undefined && pageNumbers[0] > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  className="w-9 px-0"
                >
                  1
                </Button>
                {pageNumbers[0] > 2 && (
                  <span className="text-[var(--text-secondary)] px-1">...</span>
                )}
              </>
            )}

            {pageNumbers.map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "ghost"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="w-9 px-0"
              >
                {page}
              </Button>
            ))}

            {pageNumbers[pageNumbers.length - 1] !== undefined &&
              pageNumbers[pageNumbers.length - 1]! < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1]! < totalPages - 1 && (
                    <span className="text-[var(--text-secondary)] px-1">...</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    className="w-9 px-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-9 px-0"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
