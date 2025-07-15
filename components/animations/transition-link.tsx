"use client";

import { useRouter } from "next/navigation";
import { animatePageOut } from "@/hooks/useAnimate";
import { ReactNode } from "react";
import { Button } from "../ui/button";

export default function TransitionLink({
  href,
  label,
  cn,
  color,
  svg,
}: {
  cn?: string;
  href: string;
  label?: string;
  color?: "inverted" | undefined;
  svg?: {
    icon?: "start" | undefined;
    component: ReactNode;
  };
}) {
  const router = useRouter();

  const handleClick = () => {
    animatePageOut(href, router);
  };

  return (
    <Button
      className={`rounded-xl border border-solid cursor-pointer  ${cn}`}
      color={color}
      onClick={handleClick}
    />
  );
}