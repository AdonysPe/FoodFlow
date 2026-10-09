import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

// The B design's type pair, loaded once for every marketing route. The `.lb`
// block at the end of globals.css re-points the theme's font roles to them, so
// the dashboard and the carta keep their own faces.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

export const lbFontClasses = `${display.variable} ${text.variable} ${mono.variable}`;
