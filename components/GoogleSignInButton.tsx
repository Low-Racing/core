"use client";
import { signIn } from "next-auth/react";
import { Button } from "@heroui/button";
import { FcGoogle } from "react-icons/fc";

export default function GoogleSignInButton() {
  return (
    <Button
      variant="bordered"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="flex items-center gap-2"
    >
      <FcGoogle className="text-xl" /> Entrar com Google
    </Button>
  );
}
