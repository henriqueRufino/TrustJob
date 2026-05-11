"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  enviarMensagemChat,
  getConversaPorId,
  getMensagensPorConversa,
  getUsuarioLogadoChat,
  marcarConversaComoLida,
  type ChatConversaDetalhe,
  type ChatMensagem,
  type UsuarioChat,
} from "@/services/chat-service"

type ChatConversaProps = {
  conversaId: number
}

export default function ChatConversa({ conversaId }: ChatConversaProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const mensagensContainerRef = React.useRef<HTMLDivElement | null>(null)

  const [usuarioLogado, setUsuarioLogado] = React.useState<UsuarioChat | null>(
    null
  )
  const [conversa, setConversa] = React.useState<ChatConversaDetalhe | null>(
    null
  )
  const [mensagens, setMensagens] = React.useState<ChatMensagem[]>([])
  const [novaMensagem, setNovaMensagem] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function carregarConversa() {
      setLoading(true)
      setErro(null)

      try {
        const usuarioData = await getUsuarioLogadoChat()

        if (!usuarioData) {
          setErro("Você precisa estar logado para acessar esta conversa.")
          setLoading(false)
          return
        }

        const conversaData = await getConversaPorId(conversaId)

        if (!conversaData) {
          setErro("Conversa não encontrada.")
          setLoading(false)
          return
        }

        const usuarioParticipaDaConversa =
          conversaData.cliente_id === usuarioData.id ||
          conversaData.prestador_id === usuarioData.id

        if (!usuarioParticipaDaConversa) {
          setErro("Você não participa desta conversa.")
          setLoading(false)
          return
        }

        const mensagensData = await getMensagensPorConversa(conversaId)

        await marcarConversaComoLida(conversaId, usuarioData.id)

        window.dispatchEvent(new Event("chat-notificacoes-atualizadas"))

        setUsuarioLogado(usuarioData)
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

    carregarConversa()
  }, [conversaId])

  React.useEffect(() => {
    if (!conversa || !usuarioLogado) {
      return
    }

    const channel = supabase
      .channel(`chat-conversa-${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagem",
          filter: `conversa_id=eq.${conversaId}`,
        },
        async (payload) => {
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

            const remetenteNome =
              novaMensagemRecebida.remetente_id === conversa.cliente_id
                ? conversa.cliente_nome
                : conversa.prestador_nome

            const remetenteFoto =
              novaMensagemRecebida.remetente_id === conversa.cliente_id
                ? conversa.cliente_foto
                : conversa.prestador_foto

            return [
              ...mensagensAtuais,
              {
                id: novaMensagemRecebida.id,
                conversa_id: novaMensagemRecebida.conversa_id,
                remetente_id: novaMensagemRecebida.remetente_id,
                mensagem: novaMensagemRecebida.mensagem,
                created_at: novaMensagemRecebida.created_at,
                remetente_nome: remetenteNome ?? null,
                remetente_foto: remetenteFoto ?? null,
              },
            ]
          })

          if (novaMensagemRecebida.remetente_id !== usuarioLogado.id) {
            await marcarConversaComoLida(conversaId, usuarioLogado.id)

            window.dispatchEvent(new Event("chat-notificacoes-atualizadas"))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversa, conversaId, supabase, usuarioLogado])

  React.useEffect(() => {
    mensagensContainerRef.current?.scrollTo({
      top: mensagensContainerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [mensagens])

  async function handleEnviarMensagem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!usuarioLogado) {
      return
    }

    const mensagemTratada = novaMensagem.trim()

    if (!mensagemTratada) {
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      await enviarMensagemChat(conversaId, usuarioLogado.id, mensagemTratada)
      await marcarConversaComoLida(conversaId, usuarioLogado.id)

      window.dispatchEvent(new Event("chat-notificacoes-atualizadas"))

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

  function getNomeOutroUsuario() {
    if (!usuarioLogado || !conversa) {
      return "Conversa"
    }

    if (usuarioLogado.id === conversa.cliente_id) {
      return conversa.prestador_nome ?? "Prestador"
    }

    return conversa.cliente_nome ?? "Cliente"
  }

  function getFotoOutroUsuario() {
    if (!usuarioLogado || !conversa) {
      return null
    }

    if (usuarioLogado.id === conversa.cliente_id) {
      return conversa.prestador_foto
    }

    return conversa.cliente_foto
  }

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando conversa...</p>
      </section>
    )
  }

  if (erro || !conversa) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{erro ?? "Conversa não encontrada."}</p>

          <Link href="/conversas" className="font-bold underline">
            Voltar para conversas
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
            href="/conversas"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Voltar
          </Link>

          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-gray-300 bg-muted">
            {getFotoOutroUsuario() ? (
              <Image
                src={getFotoOutroUsuario() as string}
                alt={`Foto de ${getNomeOutroUsuario()}`}
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
            <h1 className="font-bold">{getNomeOutroUsuario()}</h1>

            <p className="text-xs text-muted-foreground">
              {conversa.servico_nome ?? "Serviço não informado"}
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
              Nenhuma mensagem ainda.
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