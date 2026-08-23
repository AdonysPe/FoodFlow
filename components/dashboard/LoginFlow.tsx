"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import OtpInput from "@/components/dashboard/OtpInput";
import { IconArrowRight, IconMail } from "@/components/ui/Icons";
import { requestOtp, verifyOtp } from "@/lib/actions/auth";
import { EASE } from "@/lib/motion";

const RESEND_COOLDOWN = 30;
const ACTION_TIMEOUT_MS = 10000;

// A dev-server reload or a dropped connection can leave the underlying
// fetch neither resolving nor rejecting. Race it against a timeout so the
// UI always recovers instead of sitting on "Sending…" forever.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function targetForRole(role: "admin" | "client", next: string | null) {
  if (next && next.startsWith("/dashboard")) return next;
  return role === "admin" ? "/dashboard/admin/overview" : "/dashboard/app/overview";
}

export default function LoginFlow() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function handleRequestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await withTimeout(requestOtp(email), ACTION_TIMEOUT_MS);
        if (result.ok) {
          setStep("otp");
          setCooldown(RESEND_COOLDOWN);
          setResetKey((k) => k + 1);
        } else {
          setError(result.error);
        }
      } catch {
        // A network hiccup or a dev-server reload can drop the response
        // before it reaches the client — never leave the button stuck.
        setError("Connection issue. Please try again.");
      }
    });
  }

  function handleVerify(code: string) {
    setError("");
    setVerifying(true);
    startTransition(async () => {
      try {
        const result = await withTimeout(verifyOtp(email, code), ACTION_TIMEOUT_MS);
        if (result.ok) {
          // A full navigation guarantees the middleware re-checks the
          // freshly-set session cookie from scratch. router.push() followed
          // by router.refresh() raced the same client-router transition and
          // could silently stall right after a correct code was entered.
          window.location.href = targetForRole(result.data.role, next);
        } else {
          setVerifying(false);
          setError(result.error);
          setResetKey((k) => k + 1);
        }
      } catch {
        setVerifying(false);
        setError("Connection issue. Please try again.");
        setResetKey((k) => k + 1);
      }
    });
  }

  return (
    <GlassCard className="w-full max-w-md p-7 sm:p-9" hoverLift={false}>
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <h1 className="font-display text-[1.4rem] font-bold tracking-[-0.02em] text-white">
              Log in to FoodFlow
            </h1>
            <p className="mt-2 text-[14px] text-white/50">
              Enter your email and we&apos;ll send you a one-time code.
            </p>

            <form onSubmit={handleRequestOtp} className="mt-6 flex flex-col gap-3">
              <label htmlFor="login-email" className="sr-only">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
              />
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                icon={<IconArrowRight className="h-4 w-4" />}
              >
                {isPending ? "Sending…" : "Send code"}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-accent-400">
              <IconMail className="h-5 w-5" />
            </div>
            <h1 className="text-center font-display text-[1.4rem] font-bold tracking-[-0.02em] text-white">
              Check your email
            </h1>
            <p className="mt-2 text-center text-[14px] text-white/50">
              Enter the 6-digit code sent to <span className="text-white/75">{email}</span>
            </p>

            <div className="mt-7">
              <OtpInput onComplete={handleVerify} disabled={isPending} resetKey={resetKey} />
            </div>

            <AnimatePresence initial={false}>
              {verifying && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="mt-5 flex items-center justify-center gap-2.5 text-[13px] text-white/55"
                >
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-accent-400" />
                  Verifying your code…
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-center gap-4 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                disabled={verifying}
                className="text-white/40 hover:text-white/70 disabled:opacity-40"
              >
                Change email
              </button>
              <span className="text-white/15">•</span>
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={cooldown > 0 || isPending || verifying}
                className="text-accent-400 hover:text-accent-300 disabled:text-white/25"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-5 rounded-lg border border-accent-500/20 bg-accent-500/[0.08] px-3.5 py-2.5 text-center text-[13px] text-accent-300">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
