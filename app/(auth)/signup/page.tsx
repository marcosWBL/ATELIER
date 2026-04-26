"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) { setError("Você precisa aceitar a política de privacidade para continuar."); return; }
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles")
        .insert({ id: data.user.id, store_name: storeName, email });
      if (profileError) { setError(profileError.message); setLoading(false); return; }
    }

    router.push("/");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-light tracking-widest text-ink"
            style={{ fontFamily: "Calibri, 'Gill Sans', sans-serif" }}>
            atelier
          </h1>
          <p className="text-sm text-ink-3">Crie sua conta</p>
        </div>

        <div className="bg-card rounded-2xl border border-rim p-6 space-y-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-2">Nome da loja</label>
              <input type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-lg border border-rim-2 bg-form-bg px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ink-3 transition-colors"
                placeholder="Minha Loja" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-2">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-rim-2 bg-form-bg px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ink-3 transition-colors"
                placeholder="seu@email.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-2">Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-rim-2 bg-form-bg px-3 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ink-3 transition-colors"
                placeholder="••••••••" />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-ink"
              />
              <span className="text-xs text-ink-3 leading-relaxed">
                Concordo com o armazenamento dos meus dados (nome, e-mail e dados da loja) para uso exclusivo nesta plataforma, conforme a{" "}
                <strong className="text-ink-2">Lei Geral de Proteção de Dados (LGPD)</strong>.
                Você pode solicitar a exclusão dos seus dados a qualquer momento em Configurações.
              </span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading || !consent}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-3">
          Já tenho conta.{" "}
          <Link href="/login" className="text-ink underline underline-offset-4 hover:text-ink-2 transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
