import { redirect } from "next/navigation";

// Quem nao tem sessao e enviado ao /login pelo proxy.
export default function Home() {
  redirect("/dashboard");
}
