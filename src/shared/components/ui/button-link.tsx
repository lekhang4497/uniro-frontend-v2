import * as React from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

type ButtonLinkVariantProps = VariantProps<typeof buttonVariants>;

type CommonProps = ButtonLinkVariantProps & {
  className?: string;
  children?: React.ReactNode;
};

export type ButtonLinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    external?: boolean;
    prefetch?: LinkProps["prefetch"];
  };

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, pill, href, external, prefetch, children, ...props }, ref) => {
    const isExternal = external ?? /^https?:\/\//.test(href ?? "");
    const cls = cn(buttonVariants({ variant, size, pill, className }));

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
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
        className={cls}
        {...(props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }
);
ButtonLink.displayName = "ButtonLink";

export { ButtonLink };
