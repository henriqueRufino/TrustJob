
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  getOrCreateConversa,
  getUsuarioChatPorId,
  getUsuarioLogadoChat,
} from "@/services/chat-service"

type IniciarChatProps = {
  prestadorId: number
  servicoId?: number | null
}

export default function IniciarChat({
  prestadorId,
  servicoId = null,
}: IniciarChatProps) {
  const router = useRouter()

  const [erro, setErro] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function iniciarConversa() {
      setLoading(true)
      setErro(null)

      try {
        const usuarioLogado = await getUsuarioLogadoChat()

        if (!usuarioLogado) {
          router.push("/login")
          return
        }

        if (usuarioLogado.id === prestadorId) {
          setErro("Você não pode abrir um chat consigo mesmo.")
          setLoading(false)
          return
        }

        const prestador = await getUsuarioChatPorId(prestadorId)

        if (!prestador) {
          setErro("Prestador não encontrado.")
          setLoading(false)
          return
        }

        const conversa = await getOrCreateConversa(
          usuarioLogado.id,
          prestadorId,
          servicoId
        )

        router.replace(`/conversas/${conversa.id}`)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao iniciar conversa."
        )

        setLoading(false)
      }
    }

    iniciarConversa()
  }, [prestadorId, router, servicoId])

  if (loading && !erro) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Abrindo conversa...</p>
      </section>
    )
  }

  return (
    <section className="flex justify-center px-4 py-10 md:px-8">
      <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <p>{erro ?? "Não foi possível abrir a conversa."}</p>

        <Link
          href={
            servicoId
              ? `/prestadores/${prestadorId}?servicoId=${servicoId}`
              : `/prestadores/${prestadorId}`
          }
          className="font-bold underline"
        >
          Voltar ao perfil do prestador
        </Link>
      </div>
    </section>
  )
}