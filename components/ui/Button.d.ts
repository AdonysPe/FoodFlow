import type { ReactNode } from "react";

export interface ButtonProps {
  children?: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "invert" | "ghost";
  size?: "md" | "lg";
  className?: string;
  icon?: ReactNode;
  [key: string]: unknown;
}

declare const Button: (props: ButtonProps) => JSX.Element;
export default Button;
