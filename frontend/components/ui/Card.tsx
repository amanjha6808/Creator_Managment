"use client";

import { clsx } from "clsx";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  border?: boolean;
}

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
};

export function Card({
  children,
  padding = "md",
  hover = false,
  border = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl shadow-sm",
        border && "border border-slate-100",
        hover &&
          "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        PADDING[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between px-5 py-4 border-b border-slate-100",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}
