import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario";
}

export function Button({ variante = "secundario", className = "", ...props }: ButtonProps) {
  return (
    <button className={`button button-${variante} ${className}`.trim()} {...props} />
  );
}
