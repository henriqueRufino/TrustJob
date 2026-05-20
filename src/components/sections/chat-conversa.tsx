"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  confirmarSolicitacaoPeloChat,
  criarOuAtualizarSolicitacaoPeloChat,
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

  const [mostrarFormularioSolicitacao, setMostrarFormularioSolicitacao] =
    React.useState(false)
  const [dataAgendada, setDataAgendada] = React.useState("")
  const [valorFinal, setValorFinal] = React.useState("")
  const [observacoes, setObservacoes] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [enviando, setEnviando] = React.useState(false)
  const [salvandoSolicitacao, setSalvandoSolicitacao] = React.useState(false)
  const [confirmandoSolicitacao, setConfirmandoSolicitacao] =
    React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  const usuarioEhCliente =
    !!usuarioLogado && !!conversa && usuarioLogado.id === conversa.cliente_id

  const usuarioEhPrestador =
    !!usuarioLogado && !!conversa && usuarioLogado.id === conversa.prestador_id

  const solicitacaoExiste = !!conversa?.servico_solicitado_id
  const solicitacaoPendente = conversa?.servico_solicitado_etapa_id === 1
  const solicitacaoConcluida = conversa?.servico_solicitado_etapa_id === 4

  const podeClienteAceitarSolicitacao =
    usuarioEhCliente && solicitacaoExiste && solicitacaoPendente

  const podePrestadorCriarOuEditarSolicitacao =
    usuarioEhPrestador && !solicitacaoConcluida

  const recarregarConversa = React.useCallback(async () => {
    const [conversaData, mensagensData] = await Promise.all([
      getConversaPorId(conversaId),
      getMensagensPorConversa(conversaId),
    ])

    setConversa(conversaData)
    setMensagens(mensagensData)

    return conversaData
  }, [conversaId])

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

          await recarregarConversa()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversa",
          filter: `id=eq.${conversaId}`,
        },
        async () => {
          await recarregarConversa()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversa, conversaId, recarregarConversa, supabase, usuarioLogado])

  React.useEffect(() => {
    mensagensContainerRef.current?.scrollTo({
      top: mensagensContainerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [mensagens])

  React.useEffect(() => {
    if (!conversa || !mostrarFormularioSolicitacao) {
      return
    }

    if (conversa.servico_solicitado_data_agendada) {
      const data = new Date(conversa.servico_solicitado_data_agendada)
      const dataFormatada = new Date(
        data.getTime() - data.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16)

      setDataAgendada(dataFormatada)
    }

    if (conversa.servico_solicitado_valor_final !== null) {
      setValorFinal(String(conversa.servico_solicitado_valor_final))
    }

    setObservacoes(conversa.servico_solicitado_observacoes ?? "")
  }, [conversa, mostrarFormularioSolicitacao])

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

  async function handleSalvarSolicitacao(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!usuarioLogado || !conversa) {
      return
    }

    if (!usuarioEhPrestador) {
      setErro("Apenas o prestador pode criar ou editar a solicitação.")
      return
    }

    if (!dataAgendada) {
      setErro("Informe a data agendada.")
      return
    }

    const valorNormalizado = valorFinal.replace(",", ".")
    const valorConvertido = Number(valorNormalizado)

    if (!valorFinal.trim()) {
      setErro("Informe o valor final.")
      return
    }

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      setErro("Informe um valor final válido.")
      return
    }

    setSalvandoSolicitacao(true)
    setErro(null)

    try {
      await criarOuAtualizarSolicitacaoPeloChat({
        conversaId,
        prestadorId: usuarioLogado.id,
        dataAgendada,
        valorFinal: Math.round(valorConvertido),
        observacoes,
      })

      await recarregarConversa()

      setMostrarFormularioSolicitacao(false)
      setDataAgendada("")
      setValorFinal("")
      setObservacoes("")
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar solicitação."
      )
    }

    setSalvandoSolicitacao(false)
  }

  async function handleConfirmarSolicitacao() {
    if (!usuarioLogado) {
      return
    }

    setConfirmandoSolicitacao(true)
    setErro(null)

    try {
      await confirmarSolicitacaoPeloChat(conversaId, usuarioLogado.id)
      await recarregarConversa()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao confirmar solicitação."
      )
    }

    setConfirmandoSolicitacao(false)
  }

  function abrirFormularioSolicitacao() {
    setErro(null)
    setMostrarFormularioSolicitacao(true)
  }

  function fecharFormularioSolicitacao() {
    setMostrarFormularioSolicitacao(false)
    setDataAgendada("")
    setValorFinal("")
    setObservacoes("")
    setErro(null)
  }

  function formatarHora(data: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data))
  }

  function formatarDataCompleta(data: string | null) {
    if (!data) {
      return "Não informado"
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data))
  }

  function formatarValor(valor: number | null) {
    if (valor === null) {
      return "Não informado"
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
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

  function getLinkPerfilOutroUsuario() {
    if (!usuarioLogado || !conversa) {
      return null
    }

    if (usuarioLogado.id === conversa.cliente_id) {
      return conversa.servico_id
        ? `/prestadores/${conversa.prestador_id}?servicoId=${conversa.servico_id}`
        : `/prestadores/${conversa.prestador_id}`
    }

    return null
  }

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando conversa...</p>
      </section>
    )
  }

  if (erro && !conversa) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{erro}</p>

          <Link href="/conversas" className="font-bold underline">
            Voltar para conversas
          </Link>
        </div>
      </section>
    )
  }

  if (!conversa) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>Conversa não encontrada.</p>

          <Link href="/conversas" className="font-bold underline">
            Voltar para conversas
          </Link>
        </div>
      </section>
    )
  }

  const linkPerfilOutroUsuario = getLinkPerfilOutroUsuario()

  const avatarOutroUsuario = (
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
  )

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-6xl flex-col gap-4">
        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        <div className="flex h-[calc(100vh-180px)] w-full overflow-hidden rounded-3xl border border-gray-300 bg-background shadow-sm">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/conversas"
                  className="shrink-0 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </Link>

                {linkPerfilOutroUsuario ? (
                  <Link
                    href={linkPerfilOutroUsuario}
                    className="shrink-0 transition hover:opacity-80"
                  >
                    {avatarOutroUsuario}
                  </Link>
                ) : (
                  avatarOutroUsuario
                )}

                <div className="min-w-0">
                  <h1 className="truncate font-bold">{getNomeOutroUsuario()}</h1>

                  <p className="truncate text-xs text-muted-foreground">
                    {conversa.servico_nome ?? "Serviço não informado"}
                  </p>
                </div>
              </div>

              {podePrestadorCriarOuEditarSolicitacao && (
                <button
                  type="button"
                  onClick={abrirFormularioSolicitacao}
                  className="shrink-0 rounded-xl bg-blue-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900"
                >
                  {solicitacaoExiste
                    ? "Editar solicitação"
                    : "Criar solicitação"}
                </button>
              )}
            </div>

            {solicitacaoPendente && (
              <div className="border-b border-gray-200 bg-muted/40 p-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-300 bg-background p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold">
                      Solicitação de serviço
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Status: aguardando confirmação do cliente
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Data agendada:{" "}
                      {formatarDataCompleta(
                        conversa.servico_solicitado_data_agendada
                      )}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Valor final:{" "}
                      {formatarValor(conversa.servico_solicitado_valor_final)}
                    </p>

                    {conversa.servico_solicitado_observacoes && (
                      <p className="text-xs text-muted-foreground">
                        Observações:{" "}
                        {conversa.servico_solicitado_observacoes}
                      </p>
                    )}
                  </div>

                  {podeClienteAceitarSolicitacao && (
                    <button
                      type="button"
                      onClick={handleConfirmarSolicitacao}
                      disabled={confirmandoSolicitacao}
                      className="rounded-xl bg-blue-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                    >
                      {confirmandoSolicitacao
                        ? "Confirmando..."
                        : "Aceitar serviço"}
                    </button>
                  )}
                </div>
              </div>
            )}

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
                        mensagemDoUsuarioLogado
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[75%] flex-col gap-1 whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${
                          mensagemDoUsuarioLogado
                            ? "bg-blue-950 text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <span className="wrap-break-word">
                          {mensagem.mensagem}
                        </span>

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

          {mostrarFormularioSolicitacao && usuarioEhPrestador && (
            <aside className="hidden w-80 shrink-0 border-l border-gray-200 bg-background p-4 md:block">
              <form
                onSubmit={handleSalvarSolicitacao}
                className="flex h-full flex-col gap-4"
              >
                <div>
                  <h2 className="text-lg font-bold">
                    {solicitacaoExiste
                      ? "Editar solicitação"
                      : "Criar solicitação"}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Informe os dados para enviar ao cliente.
                  </p>
                </div>

                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Data agendada
                  <input
                    type="datetime-local"
                    value={dataAgendada}
                    onChange={(event) => setDataAgendada(event.target.value)}
                    className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Valor final
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorFinal}
                    onChange={(event) => setValorFinal(event.target.value)}
                    placeholder="Ex: 250"
                    className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                  />
                </label>

                <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
                  Observações
                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Descreva detalhes da solicitação..."
                    className="min-h-32 flex-1 resize-none rounded-xl border border-gray-300 bg-background p-3 text-sm outline-none"
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={salvandoSolicitacao}
                    className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                  >
                    {salvandoSolicitacao
                      ? "Salvando..."
                      : "Enviar solicitação"}
                  </button>

                  <button
                    type="button"
                    onClick={fecharFormularioSolicitacao}
                    disabled={salvandoSolicitacao}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}