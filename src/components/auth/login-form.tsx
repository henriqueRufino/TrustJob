"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [modo, setModo] = React.useState<"login" | "signup">("login")
  const [email, setEmail] = React.useState("")
  const [senha, setSenha] = React.useState("")
  const [confirmarSenha, setConfirmarSenha] = React.useState("")
  const [mostrarSenha, setMostrarSenha] = React.useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] =
    React.useState(false)
  const [tipoUsuario, setTipoUsuario] = React.useState<"cliente" | "prestador">(
    "cliente"
  )

  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mensagem, setMensagem] = React.useState<string | null>(null)

  const isSignup = modo === "signup"

  function emailValido(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function getTipoUserId(tipo: "cliente" | "prestador") {
    return tipo === "cliente" ? 1 : 2
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setErro(null)
    setMensagem(null)

    const emailTratado = email.trim().toLowerCase()

    if (!emailValido(emailTratado)) {
      setErro("Digite um e-mail válido.")
      setLoading(false)
      return
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.")
      setLoading(false)
      return
    }

    if (isSignup && senha !== confirmarSenha) {
      setErro("As senhas não coincidem. Verifique e tente novamente.")
      setLoading(false)
      return
    }

    if (!isSignup) {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTratado,
        password: senha,
      })

      setLoading(false)

      if (error) {
        setErro("E-mail ou senha inválidos.")
        return
      }

      router.push("/")
      setTimeout(() => {
        router.refresh()
      }, 100)
      return
    }

    const tipoUserId = getTipoUserId(tipoUsuario)

    const { error } = await supabase.auth.signUp({
      email: emailTratado,
      password: senha,
      options: {
        data: {
          tipo_user_id: tipoUserId,
        },
      },
    })

    setLoading(false)

    if (error) {
      setErro(error.message)
      return
    }

    setMensagem("Cadastro realizado! Confirme seu e-mail para acessar sua conta.")
    setEmail("")
    setSenha("")
    setConfirmarSenha("")
    setModo("login")
  }

  function trocarModo() {
    setErro(null)
    setMensagem(null)
    setMostrarSenha(false)
    setMostrarConfirmarSenha(false)
    setConfirmarSenha("")
    setModo((m) => (m === "login" ? "signup" : "login"))
  }

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12 md:px-8">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold">
            {isSignup ? "Registrar-se" : "Entrar"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {isSignup
              ? "Crie sua conta para começar a usar o TrustJob."
              : "Acesse sua conta para continuar no TrustJob."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>

            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />

              <button
                type="button"
                onClick={() => setMostrarSenha((valor) => !valor)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                {mostrarSenha ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmarSenha" className="text-sm font-medium">
                Confirmar senha
              </label>

              <div className="relative">
                <input
                  id="confirmarSenha"
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme sua senha"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha((valor) => !valor)}
                  aria-label={
                    mostrarConfirmarSenha
                      ? "Ocultar confirmação de senha"
                      : "Mostrar confirmação de senha"
                  }
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {mostrarConfirmarSenha ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {isSignup && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Tipo de conta</label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTipoUsuario("cliente")}
                  className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition ${
                    tipoUsuario === "cliente"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Cliente
                </button>

                <button
                  type="button"
                  onClick={() => setTipoUsuario("prestador")}
                  className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition ${
                    tipoUsuario === "prestador"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  Prestador
                </button>
              </div>
            </div>
          )}

          {erro && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Registrando..."
                : "Entrando..."
              : isSignup
                ? "Registrar-se"
                : "Entrar"}
          </button>

          {!isSignup && (
            <div className="text-center">
              <Link
                href="/esqueci-senha"
                className="text-sm font-semibold text-primary transition hover:opacity-80"
              >
                Esqueci minha senha
              </Link>
            </div>
          )}
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {isSignup ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <button
            type="button"
            onClick={trocarModo}
            className="font-semibold text-primary hover:opacity-80"
          >
            {isSignup ? "Entrar" : "Registrar-se"}
          </button>
        </div>
      </div>
    </section>
  )
}