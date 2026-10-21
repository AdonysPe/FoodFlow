"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { m as motion } from "framer-motion";
import { submitClaim } from "@/lib/actions/claims";
import { CLAIM_RESPONSE_DAYS, LEGAL_HOLDER } from "@/lib/legal/holder";
import { EASE } from "@/lib/motion";

const EMPTY = {
  nombre: "",
  dni: "",
  telefono: "",
  email: "",
  distrito: "",
  kind: "reclamo",
  detalle: "",
  pedido: "",
};

const ORDER = ["nombre", "dni", "telefono", "email", "distrito", "detalle"];

const FORM_ERRORS = {
  invalid: "Revisa los campos marcados y vuelve a intentar.",
  rate_limited:
    "Hemos recibido varios envíos desde esta conexión. Espera un momento o escríbenos a " +
    LEGAL_HOLDER.legalEmail +
    " y registramos tu reclamo igual.",
  server:
    "No pudimos registrar tu reclamo. Escríbenos a " +
    LEGAL_HOLDER.legalEmail +
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
  if (values.distrito.trim().length < 2) errors.distrito = "Escribe tu distrito.";
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

  const noun = values.kind === "queja" ? "queja" : "reclamo";

  return (
    <form noValidate onSubmit={handleSubmit} className="lb-cl-form">
      {/* The date is part of the record, so it is shown, not hidden. */}
      <div className="lb-cl-formhead">
        <span>Hoja de reclamación</span>
        <span className="lb-mono">Fecha del registro: {today}</span>
      </div>

      <fieldset className="lb-cl-set">
        <legend>
          <i className="lb-mono">1</i>Identificación del consumidor
        </legend>
        <div className="lb-cl-grid">
          <Field
            id={fieldId("nombre")}
            label="Nombres y apellidos"
            value={values.nombre}
            onChange={(v) => setField("nombre", v)}
            onBlur={() => blurField("nombre")}
            error={errors.nombre}
            autoComplete="name"
            wide
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
          />
          <Field
            id={fieldId("distrito")}
            label="Distrito"
            value={values.distrito}
            onChange={(v) => setField("distrito", v)}
            onBlur={() => blurField("distrito")}
            error={errors.distrito}
            autoComplete="address-level2"
          />
        </div>
      </fieldset>

      <fieldset className="lb-cl-set">
        <legend>
          <i className="lb-mono">2</i>Tipo de solicitud
        </legend>
        {/* The distinction is not decoration: which box is ticked changes what
            the supplier is obliged to resolve. */}
        <div className="lb-cl-kinds">
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

      <fieldset className="lb-cl-set">
        <legend>
          <i className="lb-mono">3</i>Detalle
        </legend>
        <div className="lb-cl-stack">
          <TextArea
            id={fieldId("detalle")}
            label="Descripción de lo ocurrido"
            counter={`${values.detalle.length}/3000`}
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
      <div aria-hidden className="lb-cl-trap">
        <label htmlFor={fieldId("website")}>Website</label>
        <input id={fieldId("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && (
        <p role="alert" className="lb-cl-alert">
          {formError}
        </p>
      )}

      <div className="lb-cl-submit">
        <button type="submit" disabled={isPending} className="lb-cl-btn">
          {isPending && <span className="lb-cl-spin" aria-hidden />}
          {isPending ? "Registrando…" : `Registrar mi ${noun}`}
        </button>
        {/* No consent tickbox here on purpose: this record is kept because the
            law requires it, not because the consumer opted in. */}
        <p>
          Tus datos se usan únicamente para atender y responder esta solicitud, y se conservan como
          parte del Libro de Reclamaciones conforme a la normativa vigente. Puedes ejercer tus
          derechos escribiendo a {LEGAL_HOLDER.legalEmail}.
        </p>
      </div>
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
  const noun = receipt.values.kind === "queja" ? "queja" : "reclamo";

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="lb-cl-receipt"
    >
      <span className="lb-cl-ok" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path className="lb-cl-tick" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>

      <h2 className="lb-display">
        Tu {noun} quedó registrad{noun === "queja" ? "a" : "o"}
        <span style={{ color: "var(--lb-accent)" }}>.</span>
      </h2>

      <div className="lb-cl-code">
        <span className="lb-mono">Número de registro</span>
        <strong className="lb-mono">{receipt.code}</strong>
        <span>Registrado el {date}</span>
      </div>

      <p className="lb-cl-receipt-copy">
        Guarda este número: es tu constancia. Te responderemos a <strong>{receipt.values.email}</strong>{" "}
        en un plazo máximo de {CLAIM_RESPONSE_DAYS} días hábiles.
      </p>

      <dl className="lb-cl-summary">
        <Row label="Nombre" value={receipt.values.nombre} />
        <Row label="Documento" value={receipt.values.dni.toUpperCase()} />
        <Row label="Teléfono" value={receipt.values.telefono} />
        <Row label="Distrito" value={receipt.values.distrito} />
        <Row label="Tipo" value={noun === "queja" ? "Queja" : "Reclamo"} />
      </dl>

      <button type="button" onClick={() => window.print()} className="lb-cl-print">
        Imprimir constancia
      </button>

      <p className="lb-cl-fine">
        Puedes imprimir o guardar esta página como constancia. Si no recibes respuesta en el plazo
        indicado, puedes acudir a INDECOPI.
      </p>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function KindOption({ name, value, checked, onChange, title, copy }) {
  return (
    <label className={`lb-cl-kind${checked ? " is-on" : ""}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="lb-cl-dot" aria-hidden />
      <span>
        <strong>{title}</strong>
        <small>{copy}</small>
      </span>
    </label>
  );
}

function Field({ id, label, hint, error, value, onChange, onBlur, wide = false, type = "text", ...rest }) {
  return (
    <div className={`lb-cl-field${wide ? " lb-cl-field--wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="lb-cl-err">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="lb-cl-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function TextArea({ id, label, optional, counter, error, value, onChange, onBlur, rows = 5, ...rest }) {
  return (
    <div className="lb-cl-field">
      <label htmlFor={id} className="lb-cl-arealabel">
        <span>{label}</span>
        {optional && <span className="lb-cl-opt">{optional}</span>}
        {counter && <span className="lb-cl-opt lb-mono">{counter}</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="lb-cl-err">
          {error}
        </p>
      )}
    </div>
  );
}
