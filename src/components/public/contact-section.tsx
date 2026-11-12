import { getTranslations } from "next-intl/server";

import { ContactChannels } from "@/components/public/contact-channels";
import { ContactWhatsApp } from "@/components/public/contact-whatsapp";
import { SectionHeading } from "@/components/shared/section-heading";

interface ContactSectionProps {
  as?: "h1" | "h2";
  className?: string;
  showHeading?: boolean;
}

export async function ContactSection({
  as = "h2",
  className,
  showHeading = true,
}: ContactSectionProps) {
  const t = await getTranslations("contact");

  return (
    <section id="contact" className={className ?? "section-space border-t border-border/70"}>
      <div className="container-page">
        {showHeading ? (
          <SectionHeading
            as={as}
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            align="center"
            className="mx-auto max-w-2xl"
          />
        ) : null}
        <div
          className={
            showHeading
              ? "mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2"
              : "mx-auto grid max-w-5xl gap-5 lg:grid-cols-2"
          }
        >
          <ContactChannels />
          <ContactWhatsApp />
        </div>
      </div>
    </section>
  );
}
