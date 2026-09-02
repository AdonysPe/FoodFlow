"use client";

import { useId, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck, IconWhatsApp } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";
import { submitLeadCapture } from "@/lib/actions/leadCapture";
import { formatWhatsApp, normalizeWhatsApp, validateLead } from "@/lib/leads/validation";
import { LEAD_SENT_KEY, writeFlag } from "@/lib/leads/storage";
import { formatSoles } from "@/lib/format";
import { EASE } from "@/lib/motion";

const EMPTY = { nombre: "", restaurante: "", whatsapp: "", email: "" };
const ORDER = ["nombre", "restaurante", "whatsapp", "email"];

/**
 * The one lead form on the site. It renders inline in a section, inside the
 * modal and inside the exit-intent popup — same fields, same rules, same
 * success state, so copy and validation have a single home.
 *
 * The checking is ours, not the browser's: the form carries `noValidate` so
 * Chrome's native bubble (English, unstyled, gone on the next click) never
 * shows. Errors sit under the field they belong to and stay there.
 */
export default function LeadForm({
  source = "web_form",
  loss = null,
  onSuccess,
  autoFocus = false,
  className = "",
}) {
  const { t } = useLanguage();
  const copy = t.leadForm;

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(null);
  const [isPending, startTransition] = useTransition();

  // Only fields the visitor has already left get re-checked while typing, so
  // no error ever appears in a field nobody has touched yet.
  const touched = useRef({});
  const uid = useId();
  const fieldId = (name) => `${uid}-${name}`;

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched.current[name]) {
      const found = validateLead(next);
      setErrors((prev) => ({ ...prev, [name]: found[name] }));
    }
  };

  const blurField = (name) => {
    touched.current[name] = true;
    const found = validateLead(values);
    setErrors((prev) => ({ ...prev, [name]: found[name] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    const form = event.currentTarget;
    const found = validateLead(values);

    if (Object.keys(found).length > 0) {
      for (const name of ORDER) touched.current[name] = true;
      setErrors(found);
      // Send focus to the first thing that needs fixing.
      const first = ORDER.find((name) => found[name]);
      form.querySelector(`#${CSS.escape(fieldId(first))}`)?.focus();
      return;
    }

    const honeypot = String(new FormData(form).get("website") ?? "");
    const nombre = values.nombre.trim();
    const restaurante = values.restaurante.trim();

    startTransition(async () => {
      const result = await submitLeadCapture({
        nombre,
        restaurante,
        whatsapp: normalizeWhatsApp(values.whatsapp),
        email: values.email.trim(),
        source,
        perdidaMensual: loss?.mensual ?? null,
        perdidaAnual: loss?.anual ?? null,
        website: honeypot,
      });

      if (!result.ok) {
        setFormError(copy.formErrors[result.code] ?? copy.formErrors.server);
        return;
      }

      writeFlag(LEAD_SENT_KEY);
      setDone({ nombre, restaurante });
      onSuccess?.({ nombre, restaurante });
    });
  };

  if (done) return <Success copy={copy} lead={done} loss={loss} className={className} />;

  return (
    <form noValidate onSubmit={handleSubmit} className={`relative space-y-4 ${className}`}>
      <Field
        id={fieldId("nombre")}
        label={copy.fields.nombre.label}
        placeholder={copy.fields.nombre.placeholder}
        value={values.nombre}
        onChange={(v) => setField("nombre", v)}
        onBlur={() => blurField("nombre")}
        error={errors.nombre && copy.fieldErrors.nombre[errors.nombre]}
        autoComplete="name"
        autoFocus={autoFocus}
      />

      <Field
        id={fieldId("restaurante")}
        label={copy.fields.restaurante.label}
        placeholder={copy.fields.restaurante.placeholder}
        value={values.restaurante}
        onChange={(v) => setField("restaurante", v)}
        onBlur={() => blurField("restaurante")}
        error={errors.restaurante && copy.fieldErrors.restaurante[errors.restaurante]}
        autoComplete="organization"
      />

      <Field
        id={fieldId("whatsapp")}
        label={copy.fields.whatsapp.label}
        placeholder={copy.fields.whatsapp.placeholder}
        hint={copy.fields.whatsapp.hint}
        value={values.whatsapp}
        // Grouped as it is typed, so nine digits are countable at a glance.
        onChange={(v) => setField("whatsapp", formatWhatsApp(v))}
        onBlur={() => blurField("whatsapp")}
        error={errors.whatsapp && copy.fieldErrors.whatsapp[errors.whatsapp]}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        prefix="+51"
      />

      <Field
        id={fieldId("email")}
        label={copy.fields.email.label}
        placeholder={copy.fields.email.placeholder}
        optional={copy.fields.email.optional}
        value={values.email}
        onChange={(v) => setField("email", v)}
        onBlur={() => blurField("email")}
        error={errors.email && copy.fieldErrors.email[errors.email]}
        type="email"
        autoComplete="email"
      />

      {/* Honeypot: parked off-screen rather than hidden, so a bot that fills
          every input trips it while assistive tech is told to skip it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <label htmlFor={fieldId("website")}>Website</label>
        <input
          id={fieldId("website")}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-accent-400/30 bg-accent-400/[0.07] px-3.5 py-3 text-[13.5px] leading-relaxed text-accent-200"
        >
          {formError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="w-full"
        icon={
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        }
      >
        {isPending ? copy.sending : copy.submit}
      </Button>

      <p className="text-center text-[12.5px] leading-relaxed text-cream/55">
        {copy.privacy}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  optional,
  error,
  value,
  onChange,
  onBlur,
  prefix,
  type = "text",
  ...rest
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-cream/75"
      >
        {label}
        {optional && (
          <span className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-cream/55">
            {optional}
          </span>
        )}
      </label>

      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-cream/55">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-12 w-full rounded-xl border bg-ink-950/80 text-[15px] text-cream placeholder:text-cream/35 outline-none transition-colors duration-200 ${
            prefix ? "pl-[3.7rem] pr-3.5" : "px-3.5"
          } ${
            error
              ? "border-accent-400/70 focus:border-accent-400"
              : "border-cream/12 focus:border-accent-400/60"
          }`}
          {...rest}
        />
      </div>

      {error ? (
        <motion.p
          id={`${id}-error`}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mt-1.5 text-[12.5px] font-medium text-accent-300"
        >
          {error}
        </motion.p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-cream/55">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * What replaces the form once the row is saved. The WhatsApp button is the
 * only way onward, and it carries the visitor's own details — and, when the
 * calculator sent them here, the number it produced.
 */
function Success({ copy, lead, loss, className = "" }) {
  // Someone who came through the calculator opens WhatsApp with their own
  // figure already in the message — nobody has to explain themselves twice.
  const template = loss?.mensual ? copy.whatsappMessageLoss : copy.whatsappMessage;
  const message = template
    .replace("{nombre}", lead.nombre)
    .replace("{restaurante}", lead.restaurante)
    .replace("{perdida}", loss?.mensual ? formatSoles(loss.mensual) : "");
  const url = buildWhatsAppUrl(message);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`rounded-2xl border border-cream/10 bg-ink-800/70 p-6 text-center shadow-card sm:p-7 ${className}`}
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-400/12 ring-1 ring-inset ring-accent-400/35">
        <IconCheck className="h-5 w-5 text-accent-300" />
      </span>

      <p className="mt-4 font-display text-[19px] font-bold leading-snug text-white sm:text-[21px]">
        {copy.success.title.replace("{nombre}", lead.nombre)}
      </p>
      <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-cream/62">
        {copy.success.copy}
      </p>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border border-[#25D366]/35 bg-[#25D366]/12 px-5 text-[14.5px] font-semibold text-[#8af0b4] transition-colors duration-200 hover:bg-[#25D366]/20 hover:text-white"
        >
          <IconWhatsApp className="h-5 w-5" />
          {copy.success.whatsapp}
        </a>
      )}
    </motion.div>
  );
}
