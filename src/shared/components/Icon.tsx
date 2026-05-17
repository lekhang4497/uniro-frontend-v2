import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

/**
 * Lucide passthrough. Replaces the previous Material Symbols dispatcher.
 *
 * Use one of:
 *   <Icon name="Plus" />       — by Lucide component name
 *   <Icon icon={Plus} />       — by direct Lucide component reference
 *
 * The `name` prop is constrained to the set of Lucide exports so invalid
 * names fail at compile time. Material Symbols glyph names (`"add"`,
 * `"dns"`, etc.) are no longer mapped — page tasks will migrate any
 * remaining callers to direct Lucide names / components.
 */
export type IconName = keyof typeof LucideIcons;

type IconProps = {
  /** Lucide component name (e.g. "Plus", "Search"). */
  name?: IconName;
  /** Or pass a Lucide component directly. */
  icon?: ComponentType<LucideProps>;
  /** Pixel size. Default 16. */
  size?: number;
  className?: string;
} & Omit<LucideProps, "size" | "className" | "ref">;

export function Icon({ name, icon: IconComp, size = 16, className, ...rest }: IconProps) {
  const Comp =
    IconComp ?? (name ? (LucideIcons[name] as ComponentType<LucideProps> | undefined) : undefined);

  if (!Comp) return null;

  return <Comp size={size} className={className} aria-hidden="true" {...rest} />;
}

export default Icon;
