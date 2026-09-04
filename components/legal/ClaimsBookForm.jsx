"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { submitClaim } from "@/lib/actions/claims";
import { CLAIM_RESPONSE_DAYS, LEGAL_HOLDER } from "@/lib/legal/holder";
import { EASE } from "@/lib/motion";

const EMPTY = {
  nombre: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
  kind: "reclamo",
  detalle: "",
  pedido: "",
};

const ORDER = ["nombre", "dni", "telefono", "email", "direccion", "detalle"];

const FORM_ERRORS = {
  invalid: "Revisa los campos marcados y vuelve a intentar.",
  rate_limited:
    "Hemos recibido varios envíos desde esta conexión. Espera un momento o escríbenos a " +
    LEGAL_HOLDER.email +
    " y registramos tu reclamo igual.",
  server:
    "No pudimos registrar tu reclamo. Escríbenos a " +
    LEGAL_HOLDER.email +
    " y lo ingresamos nosotros con la fecha de hoy.",
};

/** Same rules the server enforces, so the message arrives before the trip. */
function validate(values) {
  const errors = {};
  if (values.nombre.trim().length < 3) errors.nombre = "Escribe tus nombres y apellidos.";
  if (!/^[0-9A-Za-z]{8,12}$/.test(values.dni.replace(/\s+/g, "")))
    errors.dni = "8 dígitos para DNI, o tu carné de extranjería.";
  const phone = values.telefono.replace(/\D/g, "");
  if (phone.length < 6 || phone.length > 15) errors.telefono = "Escribe un teléfono de contacto.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
    errors.email = "Necesitamos un correo válido para responderte.";
  if (values.direccion.trim().length < 5) errors.direccion = "Escribe tu domicilio.";
  if (values.detalle.trim().length < 20)
    errors.detalle = "Cuéntanos qué pasó, con al menos 20 caracteres.";
  return errors;
}

export default function ClaimsBookForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [isPending, startTransition] = useTransition();

  const touched = useRef({});
  const uid = useId();
  const fieldId = (name) => `${uid}-${name}`;

  // The date the entry carries. Computed on the client only, after mount, so
  // the server and the first render cannot disagree on it.
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched.current[name]) {
      const found = validate(next);
      setErrors((prev) => ({ ...prev, [name]: found[name] }));
    }
  };

  const blurField = (name) => {
    touched.current[name] = true;
    const found = validate(values);
    setErrors((prev) => ({ ...prev, [name]: found[name] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    const form = event.currentTarget;
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      for (const name of ORDER) touched.current[name] = true;
      setErrors(found);
      const first = ORDER.find((name) => found[name]);
      form.querySelector(`#${CSS.escape(fieldId(first))}`)?.focus();
      return;
    }

    const honeypot = String(new FormData(form).get("website") ?? "");

    startTransition(async () => {
      const result = await submitClaim({ ...values, website: honeypot });
      if (!result.ok) {
        setFormError(FORM_ERRORS[result.code] ?? FORM_ERRORS.server);
        return;
      }
      setReceipt({ ...result, values: { ...values } });
    });
  };

  if (receipt) return <Receipt receipt={receipt} />;

  return (
    <form noValidate onSubmit={handleSubmit} className="relative">
      {/* The date is part of the record, so it is shown, not hidden. */}
      <p className="rounded-xl border border-cream/10 bg-cream/[0.03] px-4 py-3 text-[13.5px] text-cream/60">
        Fecha del registro: <span className="font-medium text-cream/85">{today}</span>
      </p>

      <fieldset className="mt-7">
        <legend className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
          1. Identificación del consumidor
        </legend>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id={fieldId("nombre")}
            label="Nombres y apellidos"
            value={values.nombre}
            onChange={(v) => setField("nombre", v)}
            onBlur={() => blurField("nombre")}
            error={errors.nombre}
            autoComplete="name"
            className="sm:col-span-2"
          />
          <Field
            id={fieldId("dni")}
            label="DNI o carné de extranjería"
            value={values.dni}
            onChange={(v) => setField("dni", v)}
            onBlur={() => blurField("dni")}
            error={errors.dni}
            inputMode="numeric"
            maxLength={12}
          />
          <Field
            id={fieldId("telefono")}
            label="Teléfono"
            value={values.telefono}
            onChange={(v) => setField("telefono", v)}
            onBlur={() => blurField("telefono")}
            error={errors.telefono}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
          />
          <Field
            id={fieldId("email")}
            label="Correo electrónico"
            hint="Aquí te enviaremos la respuesta."
            value={values.email}
            onChange={(v) => setField("email", v)}
            onBlur={() => blurField("email")}
            error={errors.email}
            type="email"
            autoComplete="email"
            className="sm:col-span-2"
          />
          <Field
            id={fieldId("direccion")}
            label="Domicilio"
            value={values.direccion}
            onChange={(v) => setField("direccion", v)}
            onBlur={() => blurField("direccion")}
            error={errors.direccion}
            autoComplete="street-address"
            className="sm:col-span-2"
          />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
          2. Tipo de solicitud
        </legend>

        {/* The distinction is not decoration: which box is ticked changes what
            the supplier is obliged to resolve. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <KindOption
            name={`${uid}-kind`}
            value="reclamo"
            checked={values.kind === "reclamo"}
            onChange={() => setField("kind", "reclamo")}
            title="Reclamo"
            copy="Disconformidad con el servicio contratado: no funcionó, no fue lo ofrecido o hubo un cobro indebido."
          />
          <KindOption
            name={`${uid}-kind`}
            value="queja"
            checked={values.kind === "queja"}
            onChange={() => setField("kind", "queja")}
            title="Queja"
            copy="Malestar por la atención recibida, no relacionado directamente con el servicio contratado."
          />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
          3. Detalle
        </legend>

        <div className="mt-4 grid gap-4">
          <TextArea
            id={fieldId("detalle")}
            label="Descripción de lo ocurrido"
            placeholder="Cuéntanos qué pasó, cuándo y qué servicio estaba involucrado."
            value={values.detalle}
            onChange={(v) => setField("detalle", v)}
            onBlur={() => blurField("detalle")}
            error={errors.detalle}
            maxLength={3000}
          />
          <TextArea
            id={fieldId("pedido")}
            label="Lo que solicitas"
            optional="opcional"
            placeholder="Qué esperas que hagamos para resolverlo."
            value={values.pedido}
            onChange={(v) => setField("pedido", v)}
            maxLength={1500}
            rows={3}
          />
        </div>
      </fieldset>

      {/* Honeypot: parked off-screen rather than hidden, so a bot that fills
          every input trips it while assistive tech is told to skip it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <label htmlFor={fieldId("website")}>Website</label>
        <input id={fieldId("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-accent-400/30 bg-accent-400/[0.07] px-3.5 py-3 text-[13.5px] leading-relaxed text-accent-label"
        >
          {formError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="mt-8 w-full"
        icon={
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        }
      >
        {isPending ? "Registrando…" : "Registrar mi reclamo"}
      </Button>

      {/* No consent tickbox here on purpose: this record is kept because the
          law requires it, not because the consumer opted in. */}
      <p className="mt-4 text-[12.5px] leading-relaxed text-cream/50">
        Tus datos se usan únicamente para atender y responder esta solicitud, y se conservan
        como parte del Libro de Reclamaciones conforme a la normativa vigente. Puedes ejercer
        tus derechos escribiendo a {LEGAL_HOLDER.email}.
      </p>
    </form>
  );
}

/**
 * The consumer's copy. The correlative number is the whole point of this
 * screen: it is what they quote if they ever escalate to INDECOPI, so it is
 * the biggest thing on it and the page is told to print cleanly.
 */
function Receipt({ receipt }) {
  const date = new Date(receipt.date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="rounded-2xl border border-cream/10 bg-ink-800/70 p-6 shadow-card sm:p-8"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/12 ring-1 ring-inset ring-mint/30">
        <IconCheck className="h-5 w-5 text-mint-ink" />
      </span>

      <h2 className="mt-5 font-display text-[22px] font-extrabold leading-snug text-fg">
        Tu {receipt.values.kind === "queja" ? "queja" : "reclamo"} quedó registrado.
      </h2>

      <div className="mt-5 rounded-xl border border-accent-400/30 bg-accent-400/[0.06] px-5 py-4">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/55">
          Número de registro
        </p>
        <p className="mt-1 font-mono text-[26px] font-bold tracking-wide text-accent-label">
          {receipt.code}
        </p>
        <p className="mt-1 text-[13px] text-cream/55">Registrado el {date}</p>
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-cream/70">
        Guarda este número: es tu constancia. Te responderemos a{" "}
        <span className="font-medium text-fg">{receipt.values.email}</span> en un plazo
        máximo de {CLAIM_RESPONSE_DAYS} días hábiles.
      </p>

      <dl className="mt-6 grid gap-3 border-t border-cream/10 pt-5 text-[13.5px] sm:grid-cols-2">
        <Row label="Nombre" value={receipt.values.nombre} />
        <Row label="Documento" value={receipt.values.dni.toUpperCase()} />
        <Row label="Teléfono" value={receipt.values.telefono} />
        <Row label="Domicilio" value={receipt.values.direccion} />
        <Row
          label="Tipo"
          value={receipt.values.kind === "queja" ? "Queja" : "Reclamo"}
        />
      </dl>

      <p className="mt-6 text-[12.5px] leading-relaxed text-cream/45">
        Puedes imprimir o guardar esta página como constancia. Si no recibes respuesta en el
        plazo indicado, puedes acudir a INDECOPI.
      </p>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-cream/40">{label}</dt>
      <dd className="mt-0.5 break-words text-cream/80">{value}</dd>
    </div>
  );
}

function KindOption({ name, value, checked, onChange, title, copy }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-accent-400/45 bg-accent-400/[0.07]"
          : "border-cream/10 bg-cream/[0.02] hover:border-cream/20"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff5a33]"
      />
      <span>
        <span className="block text-[14.5px] font-semibold text-fg">{title}</span>
        <span className="mt-1 block text-[12.5px] leading-relaxed text-cream/55">{copy}</span>
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  className = "",
  type = "text",
  ...rest
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-cream/75">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`mt-1.5 h-12 w-full rounded-xl border bg-ink-950/80 px-3.5 text-[15px] text-cream placeholder:text-cream/35 outline-none transition-colors duration-200 ${
          error
            ? "border-accent-400/70 focus:border-accent-400"
            : "border-cream/12 focus:border-accent-400/60"
        }`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] font-medium text-accent-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-cream/40">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function TextArea({
  id,
  label,
  optional,
  error,
  value,
  onChange,
  onBlur,
  rows = 5,
  ...rest
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-cream/75"
      >
        {label}
        {optional && (
          <span className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-cream/40">
            {optional}
          </span>
        )}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-ink-950/80 px-3.5 py-3 text-[15px] leading-relaxed text-cream placeholder:text-cream/35 outline-none transition-colors duration-200 ${
          error
            ? "border-accent-400/70 focus:border-accent-400"
            : "border-cream/12 focus:border-accent-400/60"
        }`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] font-medium text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
