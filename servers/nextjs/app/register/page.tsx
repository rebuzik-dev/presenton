import { redirect } from "next/navigation";
import { isAuthDisabled } from "@/utils/auth";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  if (isAuthDisabled()) {
    redirect("/upload");
  }

  return <RegisterForm />;
}
