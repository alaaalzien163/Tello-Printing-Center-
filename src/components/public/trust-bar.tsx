import { Building2, Car, Factory, GraduationCap, HeartPulse } from "lucide-react";
import { getTranslations } from "next-intl/server";

const industries = [
  { key: "manufacturing", icon: Factory },
  { key: "architecture", icon: Building2 },
  { key: "healthcare", icon: HeartPulse },
  { key: "education", icon: GraduationCap },
  { key: "automotive", icon: Car },
] as const;

export async function TrustBar() {
  const t = await getTranslations("trust");

  return (
    <section aria-label={t("label")} className="border-b border-border/70 bg-card/60">
      <div className="container-page py-7">
        <p className="text-center text-[0.65rem] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
          {t("label")}
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {industries.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex items-center justify-center gap-2.5 text-sm font-medium text-muted-foreground"
            >
              <Icon className="size-4 text-primary/80" aria-hidden="true" />
              {t(`items.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
