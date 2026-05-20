"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function EsqueciSenhaForm() {
  const supabase = React.useMemo(() => createClient(), [])

  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [mensagem, setMensagem] = React.useState<string | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  async function handleEnviarEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const emailTratado = email.trim()

    if (!emailTratado) {
      setErro("Informe seu e-mail.")
      return
    }

    setLoading(true)
    setErro(null)
    setMensagem(null)

    const redirectTo = `${window.location.origin}/redefinir-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(emailTratado, {
      redirectTo,
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    setMensagem(
      "Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
    )
    setEmail("")
    setLoading(false)
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-300 bg-background p-7 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Recuperar senha</h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição.
          </p>
        </div>

        <form onSubmit={handleEnviarEmail} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              className="h-12 rounded-2xl border border-gray-300 bg-background px-4 text-sm outline-none"
            />
          </label>

          {erro && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-blue-950 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-bold text-blue-950 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </section>
  )
}