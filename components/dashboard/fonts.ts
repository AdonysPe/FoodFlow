import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

// The B design's type pair for every panel route, loaded once: the frame of
// the panel (DashboardShell) and the waiter's comanda both wear it. The
// `.lbd` block at the end of globals.css re-points the theme's font roles to
// these variables.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

export const panelFontClasses = `${display.variable} ${text.variable} ${mono.variable}`;
