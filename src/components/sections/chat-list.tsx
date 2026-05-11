"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getConversasDoUsuarioLogado,
  type ChatConversaLista,
} from "@/services/chat-service"

export default function ChatLista() {
  const supabase = React.useMemo(() => createClient(), [])

  const [conversas, setConversas] = React.useState<ChatConversaLista[]>([])
  const [loading, setLoading] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function carregarConversas() {
      setLoading(true)
      setErro(null)

      try {
        const conversasData = await getConversasDoUsuarioLogado()
        setConversas(conversasData)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar conversas."
        )
      }

      setLoading(false)
    }

    carregarConversas()

    const channel = supabase
      .channel("chat-lista-atualizacoes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagem",
        },
        () => {
          carregarConversas()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversa",
        },
        () => {
          carregarConversas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  function formatarHorario(data: string | null) {
    if (!data) {
      return ""
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data))
  }

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando conversas...</p>
      </section>
    )
  }

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold md:text-3xl">Conversas</h1>

          <p className="text-sm text-muted-foreground md:text-base">
            Acompanhe suas conversas abertas com clientes ou prestadores.
          </p>
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        {conversas.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-3xl border border-gray-300 bg-background shadow-sm">
            {conversas.map((conversa, index) => (
              <Link
                key={conversa.id}
                href={`/conversas/${conversa.id}`}
                className={`relative flex items-center gap-4 p-4 transition hover:bg-muted ${
                  conversa.quantidade_mensagens_nao_lidas > 0
                    ? "bg-blue-50"
                    : ""
                } ${
                  index !== conversas.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-300 bg-muted">
                  {conversa.outro_usuario_foto ? (
                    <Image
                      src={conversa.outro_usuario_foto}
                      alt={`Foto de ${
                        conversa.outro_usuario_nome ?? "usuário"
                      }`}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold">
                          {conversa.outro_usuario_nome ?? "Usuário sem nome"}
                        </p>

                        {conversa.quantidade_mensagens_nao_lidas > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white">
                            {conversa.quantidade_mensagens_nao_lidas}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs font-semibold text-muted-foreground">
                        {conversa.servico_nome ?? "Serviço não informado"}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatarHorario(
                        conversa.ultima_mensagem_created_at ??
                          conversa.updated_at
                      )}
                    </span>
                  </div>

                  <p
                    className={`mt-1 line-clamp-1 text-sm ${
                      conversa.quantidade_mensagens_nao_lidas > 0
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {conversa.ultima_mensagem ??
                      "Conversa iniciada, nenhuma mensagem enviada ainda."}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-300 p-8 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />

            <p className="font-semibold">Nenhuma conversa aberta ainda.</p>

            <p className="max-w-md text-sm text-muted-foreground">
              Quando uma conversa for iniciada, ela aparecerá aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}