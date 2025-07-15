"use client";
import GoogleSignInButton from "../../../components/GoogleSignInButton";
import { Card, CardBody, CardHeader } from "@heroui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">Criar Conta</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <GoogleSignInButton />
        </CardBody>
      </Card>
    </div>
  );
}
