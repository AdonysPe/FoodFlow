import type { ReactNode } from "react";
import Link from "next/link";
import MotionProvider from "@/components/MotionProvider";
import { LogoMark } from "@/components/ui/Logo";
import { IconArrowRight, IconCheck, IconKitchen, IconOrders } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

const flow = [
  { label: "Pedido recibido", detail: "Mesa 04 · 3 productos", icon: IconOrders, tone: "text-accent-icon bg-accent-400/10" },
  { label: "En preparación", detail: "Cocina sincronizada", icon: IconKitchen, tone: "text-warn-ink bg-warn/10" },
  { label: "Listo para servir", detail: "El equipo recibe el aviso", icon: IconCheck, tone: "text-mint-ink bg-mint/10" },
];

export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <main className="auth-surface relative min-h-screen overflow-hidden bg-ink-950 text-fg">
        <div className="pointer-events-none absolute inset-0 auth-ambient" aria-hidden />
        <header className="relative z-20 mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:h-24 lg:px-10">
          <Link href="/" className="group inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950" aria-label="Ir al inicio de FoodFlow">
            <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105" />
            <span className="font-display text-[1.05rem] font-bold tracking-[-0.025em] text-fg">FoodFlow</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-muted outline-none transition-colors hover:bg-fg/[0.05] hover:text-fg focus-visible:ring-2 focus-visible:ring-accent-400/70 sm:px-4">
              <IconArrowRight className="h-3.5 w-3.5 rotate-180" />
              <span className="hidden sm:inline">Volver al inicio</span><span className="sm:hidden">Volver</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1320px] items-center gap-12 px-5 pb-12 sm:px-8 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] lg:px-10 lg:pb-20 xl:gap-20">
          <section className="hidden max-w-[620px] lg:block" aria-label="Así funciona FoodFlow">
            <h2 className="max-w-[12ch] font-display text-[clamp(2.9rem,4.8vw,4.9rem)] font-bold leading-[0.98] tracking-[-0.038em] text-fg">Cada pedido, en su lugar.</h2>
            <p className="mt-6 max-w-[52ch] text-[1.02rem] leading-7 text-muted">Entra y toma el control de tu carta, las mesas y la cocina desde una sola operación.</p>
            <div className="auth-flow relative mt-12 max-w-[520px]" aria-label="Flujo de un pedido">
              <div className="absolute bottom-8 left-[23px] top-8 w-px bg-fg/[0.08]" aria-hidden><span className="auth-flow-signal absolute left-1/2 top-0 h-14 w-px -translate-x-1/2 bg-accent-400" /></div>
              <ol className="relative space-y-3">
                {flow.map(({ label, detail, icon: Icon, tone }, index) => (
                  <li key={label} className="auth-flow-step flex items-center gap-4 rounded-2xl px-3 py-3.5" style={{ animationDelay: `${index * 1.6}s` }}>
                    <span className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0"><span className="block text-[14px] font-semibold text-fg">{label}</span><span className="mt-0.5 block text-[12.5px] text-faint">{detail}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <div className="mx-auto w-full max-w-[500px]">{children}</div>
        </div>
      </main>
    </MotionProvider>
  );
}
