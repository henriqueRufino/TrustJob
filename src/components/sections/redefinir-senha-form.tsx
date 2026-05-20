"use client"

import * as React from "react"
import Link from "next/link"
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
  type,
}: RedefinirSenhaFormProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [senha, setSenha] = React.useState("")
  const [confirmarSenha, setConfirmarSenha] = React.useState("")
  const [validandoLink, setValidandoLink] = React.useState(true)
  const [linkValido, setLinkValido] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mensagem, setMensagem] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function prepararSessaoDeRecuperacao() {
      setValidandoLink(true)
      setErro(null)

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            setErro(
              "Link inválido ou expirado. Solicite uma nova recuperação de senha."
            )
            setLinkValido(false)
            setValidandoLink(false)
            return
          }

          setLinkValido(true)
          setValidandoLink(false)
          return
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          })

          if (error) {
            setErro(
              "Link inválido ou expirado. Solicite uma nova recuperação de senha."
            )
            setLinkValido(false)
            setValidandoLink(false)
            return
          }

          setLinkValido(true)
          setValidandoLink(false)
          return
        }

        const { data } = await supabase.auth.getSession()

        if (data.session) {
          setLinkValido(true)
          setValidandoLink(false)
          return
        }

        setErro("Link inválido ou expirado. Solicite uma nova recuperação de senha.")
        setLinkValido(false)
        setValidandoLink(false)
      } catch {
        setErro("Link inválido ou expirado. Solicite uma nova recuperação de senha.")
        setLinkValido(false)
        setValidandoLink(false)
      }
    }

    prepararSessaoDeRecuperacao()
  }, [code, tokenHash, type, supabase])

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

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.")
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

    await supabase.auth.signOut()

    setTimeout(() => {
      router.push("/login")
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
              <input
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua nova senha"
                className="h-12 rounded-2xl border border-gray-300 bg-background px-4 text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold">
              Confirmar senha
              <input
                type="password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                placeholder="Confirme sua nova senha"
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