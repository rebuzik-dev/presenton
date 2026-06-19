import { redirect } from "next/navigation";
import { isAuthDisabled } from "@/utils/auth";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  if (isAuthDisabled()) {
    redirect("/upload");
  }

  return <LoginForm />;
}
