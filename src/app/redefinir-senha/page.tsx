"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type RedefinirSenhaFormProps = {
  code: string | null
  tokenHash: string | null
  type: string | null
}

export default function RedefinirSenhaForm({
  code,
  tokenHash,
}: RedefinirSenhaFormProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [senha, setSenha] = React.useState("")
  const [confirmarSenha, setConfirmarSenha] = React.useState("")
  const [mostrarSenha, setMostrarSenha] = React.useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] =
    React.useState(false)

  const [validandoLink, setValidandoLink] = React.useState(true)
  const [linkValido, setLinkValido] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mensagem, setMensagem] = React.useState<string | null>(null)

  React.useEffect(() => {
    let telaMontada = true

    async function liberarTelaPorSessao() {
      const { data } = await supabase.auth.getSession()

      if (!telaMontada) {
        return false
      }

      if (data.session) {
        setLinkValido(true)
        setValidandoLink(false)
        setErro(null)
        return true
      }

      return false
    }

    async function prepararSessaoDeRecuperacao() {
      setValidandoLink(true)
      setErro(null)

      const jaTemSessao = await liberarTelaPorSessao()

      if (jaTemSessao) {
        return
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          await liberarTelaPorSessao()
        }
      })

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (!error) {
            await liberarTelaPorSessao()
            subscription.unsubscribe()
            return
          }
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          })

          if (!error) {
            await liberarTelaPorSessao()
            subscription.unsubscribe()
            return
          }
        }

        setTimeout(async () => {
          if (!telaMontada) {
            return
          }

          const sessaoFoiCriada = await liberarTelaPorSessao()

          if (!sessaoFoiCriada) {
            setErro(
              "Link inválido ou expirado. Solicite uma nova recuperação de senha."
            )
            setLinkValido(false)
            setValidandoLink(false)
          }

          subscription.unsubscribe()
        }, 800)
      } catch {
        const sessaoFoiCriada = await liberarTelaPorSessao()

        if (!sessaoFoiCriada) {
          setErro(
            "Link inválido ou expirado. Solicite uma nova recuperação de senha."
          )
          setLinkValido(false)
          setValidandoLink(false)
        }

        subscription.unsubscribe()
      }
    }

    prepararSessaoDeRecuperacao()

    return () => {
      telaMontada = false
    }
  }, [code, tokenHash, supabase])

  async function handleAtualizarSenha(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!linkValido) {
      setErro("Link inválido ou expirado.")
      return
    }

    if (!senha.trim()) {
      setErro("Informe a nova senha.")
      return
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.")
      return
    }

    if (!confirmarSenha.trim()) {
      setErro("Confirme a nova senha.")
      return
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem. Verifique e tente novamente.")
      return
    }

    setLoading(true)
    setErro(null)
    setMensagem(null)

    const { error } = await supabase.auth.updateUser({
      password: senha,
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    setMensagem("Senha redefinida com sucesso. Você será redirecionado para o login.")

    await supabase.auth.signOut({ scope: "local" })

    setTimeout(() => {
      router.push("/login")
      router.refresh()
    }, 1500)
  }

  if (validandoLink) {
    return (
      <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
        <p className="text-muted-foreground">Validando link de recuperação...</p>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-300 bg-background p-7 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Redefinir senha</h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Crie uma nova senha para acessar sua conta.
          </p>
        </div>

        {!linkValido ? (
          <div className="flex flex-col gap-4">
            {erro && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {erro}
              </p>
            )}

            <Link
              href="/esqueci-senha"
              className="h-12 rounded-xl bg-blue-950 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-900"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleAtualizarSenha} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Nova senha

              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(event) => {
                    setSenha(event.target.value)
                    setErro(null)
                  }}
                  placeholder="Digite sua nova senha"
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-background px-4 pr-11 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 flex -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold">
              Confirmar senha

              <div className="relative">
                <input
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(event) => {
                    setConfirmarSenha(event.target.value)
                    setErro(null)
                  }}
                  placeholder="Confirme sua nova senha"
                  className="h-12 w-full rounded-2xl border border-gray-300 bg-background px-4 pr-11 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha((valor) => !valor)}
                  aria-label={
                    mostrarConfirmarSenha
                      ? "Ocultar confirmação de senha"
                      : "Mostrar confirmação de senha"
                  }
                  className="absolute right-4 top-1/2 flex -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {mostrarConfirmarSenha ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
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
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-bold text-blue-950 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </section>
  )
}