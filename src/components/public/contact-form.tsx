"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContactSchema, type ContactFormValues } from "@/schemas/contact";
import { cn } from "@/lib/utils";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function ContactForm() {
  const t = useTranslations("contact");
  const tv = useTranslations("validation");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const schema = createContactSchema(tv);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: ContactFormValues) {
    setStatus("submitting");
    try {
      // Phase 1 demo: validate locally and simulate a request. Phase 2 sends
      // this payload to a Supabase-backed route with server-side validation.
      await wait(700);
      void values;
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function startOver() {
    reset();
    setStatus("idle");
  }

  if (status === "success") {
    return (
      <div
        className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-foreground">{t("successTitle")}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("successDescription")}
        </p>
        <Button variant="outline" className="mt-6" onClick={startOver}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8"
      aria-labelledby="contact-form-title"
    >
      <h3 id="contact-form-title" className="text-lg font-semibold text-foreground">
        {t("formTitle")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("formDescription")}</p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contact-name">{t("name")}</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p id="contact-name-error" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contact-email">{t("email")}</Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              dir="ltr"
              placeholder={t("emailPlaceholder")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="contact-email-error" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-phone">
              {t("phone")} <span className="font-normal text-muted-foreground">({t("phonePlaceholder")})</span>
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              dir="ltr"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "contact-phone-error" : undefined}
              {...register("phone")}
            />
            {errors.phone ? (
              <p id="contact-phone-error" className="text-xs text-destructive">
                {errors.phone.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact-message">{t("message")}</Label>
          <Textarea
            id="contact-message"
            rows={5}
            placeholder={t("messagePlaceholder")}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            {...register("message")}
          />
          {errors.message ? (
            <p id="contact-message-error" className="text-xs text-destructive">
              {errors.message.message}
            </p>
          ) : null}
        </div>
      </div>

      {status === "error" ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
          <p className="text-sm font-medium text-destructive">{t("errorTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("errorDescription")}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full sm:w-auto">
          {status === "submitting" ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {status === "submitting" ? t("submitting") : t("submit")}
        </Button>
        <p className={cn("text-xs leading-5 text-muted-foreground")}>{t("demoNotice")}</p>
      </div>
    </form>
  );
}
