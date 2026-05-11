"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  enviarMensagemChat,
  getMensagensPorConversa,
  getOrCreateConversa,
  getUsuarioChatPorId,
  getUsuarioLogadoChat,
  type ChatConversa,
  type ChatMensagem,
  type UsuarioChat,
} from "@/services/chat-service"

type PrestadorChatProps = {
  prestadorId: number
  servicoId?: number | null
}

export default function PrestadorChat({
  prestadorId,
  servicoId = null,
}: PrestadorChatProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const mensagensContainerRef = React.useRef<HTMLDivElement | null>(null)

  const [usuarioLogado, setUsuarioLogado] = React.useState<UsuarioChat | null>(
    null
  )
  const [prestador, setPrestador] = React.useState<UsuarioChat | null>(null)
  const [conversa, setConversa] = React.useState<ChatConversa | null>(null)
  const [mensagens, setMensagens] = React.useState<ChatMensagem[]>([])
  const [novaMensagem, setNovaMensagem] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function carregarChat() {
      setLoading(true)
      setErro(null)

      try {
        const usuarioData = await getUsuarioLogadoChat()

        if (!usuarioData) {
          router.push("/login")
          return
        }

        if (usuarioData.id === prestadorId) {
          setErro("Você não pode abrir um chat consigo mesmo.")
          setLoading(false)
          return
        }

        const prestadorData = await getUsuarioChatPorId(prestadorId)

        if (!prestadorData) {
          setErro("Prestador não encontrado.")
          setLoading(false)
          return
        }

        const conversaData = await getOrCreateConversa(
          usuarioData.id,
          prestadorId,
          servicoId
        )

        const mensagensData = await getMensagensPorConversa(conversaData.id)

        setUsuarioLogado(usuarioData)
        setPrestador(prestadorData)
        setConversa(conversaData)
        setMensagens(mensagensData)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar conversa."
        )
      }

      setLoading(false)
    }

    carregarChat()
  }, [prestadorId, router, servicoId])

  React.useEffect(() => {
    if (!conversa) {
      return
    }

    const channel = supabase
      .channel(`chat-conversa-${conversa.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagem",
          filter: `conversa_id=eq.${conversa.id}`,
        },
        (payload) => {
          const novaMensagemRecebida = payload.new as {
            id: number
            conversa_id: number
            remetente_id: number
            mensagem: string
            created_at: string
          }

          setMensagens((mensagensAtuais) => {
            const mensagemJaExiste = mensagensAtuais.some(
              (mensagem) => mensagem.id === novaMensagemRecebida.id
            )

            if (mensagemJaExiste) {
              return mensagensAtuais
            }

            const remetente =
              novaMensagemRecebida.remetente_id === usuarioLogado?.id
                ? usuarioLogado
                : prestador

            return [
              ...mensagensAtuais,
              {
                id: novaMensagemRecebida.id,
                conversa_id: novaMensagemRecebida.conversa_id,
                remetente_id: novaMensagemRecebida.remetente_id,
                mensagem: novaMensagemRecebida.mensagem,
                created_at: novaMensagemRecebida.created_at,
                remetente_nome: remetente?.nome ?? null,
                remetente_foto: remetente?.foto ?? null,
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversa, prestador, supabase, usuarioLogado])

  React.useEffect(() => {
    mensagensContainerRef.current?.scrollTo({
      top: mensagensContainerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [mensagens])

  async function handleEnviarMensagem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!usuarioLogado || !conversa) {
      return
    }

    const mensagemTratada = novaMensagem.trim()

    if (!mensagemTratada) {
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      await enviarMensagemChat(
        conversa.id,
        usuarioLogado.id,
        mensagemTratada
      )

      setNovaMensagem("")
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao enviar mensagem."
      )
    }

    setEnviando(false)
  }

  function formatarHora(data: string) {
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
        <p className="text-muted-foreground">Carregando conversa...</p>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{erro}</p>

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

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex h-[calc(100vh-180px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-300 bg-background shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 p-4">
          <Link
            href={
              servicoId
                ? `/prestadores/${prestadorId}?servicoId=${servicoId}`
                : `/prestadores/${prestadorId}`
            }
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Voltar
          </Link>

          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-gray-300 bg-muted">
            {prestador?.foto ? (
              <Image
                src={prestador.foto}
                alt={`Foto de ${prestador.nome ?? "prestador"}`}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                Foto
              </div>
            )}
          </div>

          <div>
            <h1 className="font-bold">{prestador?.nome ?? "Prestador"}</h1>

            <p className="text-xs text-muted-foreground">
              Chat em tempo real
            </p>
          </div>
        </div>

        <div
          ref={mensagensContainerRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          {mensagens.length > 0 ? (
            mensagens.map((mensagem) => {
              const mensagemDoUsuarioLogado =
                mensagem.remetente_id === usuarioLogado?.id

              return (
                <div
                  key={mensagem.id}
                  className={`flex ${
                    mensagemDoUsuarioLogado ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[75%] flex-col gap-1 rounded-2xl px-4 py-2 text-sm ${
                      mensagemDoUsuarioLogado
                        ? "bg-blue-950 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <span className="wrap-break-word">{mensagem.mensagem}</span>

                    <span
                      className={`text-[11px] ${
                        mensagemDoUsuarioLogado
                          ? "text-white/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatarHora(mensagem.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Envie a primeira mensagem para iniciar a conversa.
            </div>
          )}
        </div>

        <form
          onSubmit={handleEnviarMensagem}
          className="flex gap-3 border-t border-gray-200 p-4"
        >
          <input
            value={novaMensagem}
            onChange={(event) => setNovaMensagem(event.target.value)}
            placeholder="Digite sua mensagem..."
            className="h-11 flex-1 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
          />

          <button
            type="submit"
            disabled={enviando || !novaMensagem.trim()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </form>
      </div>
    </section>
  )
}