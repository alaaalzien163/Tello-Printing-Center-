// import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function AboutSection() {
  const t = await getTranslations("about");

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="section-space scroll-mt-24 border-t border-border/70"
    >
      <div className="container-page">
        <h2
          id="about-title"
          className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-muted-foreground md:text-[1.05rem]">
          {t("description")}
        </p>

        {/* <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-6">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[0.65rem] leading-4 font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-base font-semibold text-foreground sm:text-lg">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl> */}

        {/* <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <p className="eyebrow">{t("story.eyebrow")}</p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("story.title")}
          </h3>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>{t("story.paragraphs.experience")}</p>
            <p>{t("story.paragraphs.choice")}</p>
          </div>
          <p className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-sm font-medium text-foreground">
            <MapPin className="size-4 text-primary-text" aria-hidden="true" />
            {t("story.location")}
          </p>
        </div> */}
      </div>
    </section>
  );
}
