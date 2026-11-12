import { AtSign, Briefcase, Camera, Send, Users } from "lucide-react";

import type { SocialLink } from "@/config/site";
import { cn } from "@/lib/utils";
import { externalLinkProps } from "@/lib/whatsapp";

const socialIcons: Record<SocialLink["key"], typeof Camera> = {
  facebook: Users,
  instagram: Camera,
  telegram: Send,
  linkedin: Briefcase,
  x: AtSign,
};

const socialLabels: Record<SocialLink["key"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  x: "X",
};

interface SocialLinksProps {
  links: SocialLink[];
  className?: string;
  linkClassName?: string;
  iconClassName?: string;
}

export function SocialLinks({ links, className, linkClassName, iconClassName }: SocialLinksProps) {
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {links.map((social) => {
        const Icon = socialIcons[social.key];

        return (
          <li key={social.key}>
            <a
              href={social.href}
              {...externalLinkProps}
              aria-label={socialLabels[social.key]}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg bg-white/8 text-white/70 transition-colors hover:bg-white/15 hover:text-white",
                linkClassName,
              )}
            >
              <Icon className={cn("size-4", iconClassName)} aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
