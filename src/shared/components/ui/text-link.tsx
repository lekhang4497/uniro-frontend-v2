import * as React from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";

import { cn } from "@/lib/utils";

const baseClass =
  "text-[var(--accent-blue)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] transition-colors";

type CommonProps = {
  className?: string;
  children?: React.ReactNode;
};

export type TextLinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    external?: boolean;
    prefetch?: LinkProps["prefetch"];
  };

const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, href, external, prefetch, children, ...props }, ref) => {
    const isExternal = external ?? /^https?:\/\//.test(href ?? "");

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseClass, className)}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        className={cn(baseClass, className)}
        {...(props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }
);
TextLink.displayName = "TextLink";

export { TextLink };
