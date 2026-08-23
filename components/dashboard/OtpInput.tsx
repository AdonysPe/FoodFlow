"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

export default function OtpInput({
  onComplete,
  disabled = false,
  resetKey,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  resetKey?: number | string;
}) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const submittedRef = useRef<string | null>(null);
  const lastResetKey = useRef(resetKey);

  if (lastResetKey.current !== resetKey) {
    lastResetKey.current = resetKey;
    if (digits.some(Boolean)) setDigits(Array(LENGTH).fill(""));
    submittedRef.current = null;
  }

  function updateDigits(next: string[]) {
    setDigits(next);
    const code = next.join("");
    if (code.length === LENGTH && submittedRef.current !== code) {
      submittedRef.current = code;
      onComplete(code);
    }
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[index] = "";
      updateDigits(next);
      return;
    }
    const next = [...digits];
    value.split("").forEach((char, i) => {
      if (index + i < LENGTH) next[index + i] = char;
    });
    updateDigits(next);
    const target = Math.min(index + value.length, LENGTH - 1);
    inputsRef.current[target]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    handleChange(0, pasted);
  }

  return (
    <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-13 w-11 rounded-xl border border-white/[0.1] bg-white/[0.04] text-center text-xl font-semibold text-white outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10 disabled:opacity-50 sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}
