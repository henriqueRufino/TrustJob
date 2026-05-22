"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, MapPin, Plus, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  aceitarAcrescimoAgendamento,
  confirmarCheckinAgendamento,
  confirmarCheckoutAgendamento,
  criarOuAtualizarAcrescimoAgendamento,
  excluirAcrescimoAgendamento,
  getAgendamentosDoUsuarioLogado,
  recusarAcrescimoAgendamento,
  solicitarCheckinAgendamento,
  solicitarCheckoutAgendamento,
  type AcrescimoAgendamento,
  type AgendamentoItem,
} from "@/services/agendamento-service"

type AbaAgendamentos = "agendamentos" | "finalizados"

export default function AgendamentosLista() {
  const supabase = React.useMemo(() => createClient(), [])

  const [abaAtiva, setAbaAtiva] = React.useState<AbaAgendamentos>("agendamentos")
  const [usuarioId, setUsuarioId] = React.useState<number | null>(null)
  const [agendamentos, setAgendamentos] = React.useState<AgendamentoItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [processandoId, setProcessandoId] = React.useState<number | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  const [formAcrescimoAbertoId, setFormAcrescimoAbertoId] = React.useState<
    number | null
  >(null)
  const [acrescimoEditandoId, setAcrescimoEditandoId] = React.useState<
    number | null
  >(null)
  const [tituloAcrescimo, setTituloAcrescimo] = React.useState("")
  const [descricaoAcrescimo, setDescricaoAcrescimo] = React.useState("")
  const [valorAcrescimo, setValorAcrescimo] = React.useState("")

  const [formCheckoutAbertoId, setFormCheckoutAbertoId] = React.useState<
    number | null
  >(null)
  const [checkoutFotos, setCheckoutFotos] = React.useState<File[]>([])

  const [formAvaliacaoAbertoId, setFormAvaliacaoAbertoId] = React.useState<
    number | null
  >(null)
  const [notaAvaliacao, setNotaAvaliacao] = React.useState<number>(0)
  const [tituloAvaliacao, setTituloAvaliacao] = React.useState("")
  const [comentarioAvaliacao, setComentarioAvaliacao] = React.useState("")
  const [midiasAvaliacao, setMidiasAvaliacao] = React.useState<File[]>([])

  const carregarAgendamentos = React.useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      const data = await getAgendamentosDoUsuarioLogado()

      setUsuarioId(data.usuario_id || null)
      setAgendamentos(data.agendamentos)

      if (data.usuario_id && typeof window !== "undefined") {
        localStorage.setItem(
          `agendamentos:last-read:${data.usuario_id}`,
          new Date().toISOString()
        )

        window.dispatchEvent(new Event("agendamentos-notificacoes-atualizadas"))
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar agendamentos."
      )
    }

    setLoading(false)
  }, [])

  React.useEffect(() => {
    carregarAgendamentos()

    const channel = supabase
      .channel("agendamentos-lista-atualizacoes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "servico_solicitado",
        },
        () => {
          carregarAgendamentos()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "servico_acrescimo",
        },
        () => {
          carregarAgendamentos()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "avaliacao",
        },
        () => {
          carregarAgendamentos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [carregarAgendamentos, supabase])

  function formatarData(data: string | null) {
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

  function getStatus(etapaId: number | null, etapaNome: string | null) {
    if (etapaId === 2) return "Confirmado"
    if (etapaId === 3) return "Em aberto"
    if (etapaId === 4) return "Em execução"
    if (etapaId === 5) return "Aguardando aprovação do checkout"
    if (etapaId === 9) return "Finalizado"

    return etapaNome ?? "Status não informado"
  }

  function getClasseStatusAcrescimo(status: string | null) {
    if (status === "aceito") return "text-green-600"
    if (status === "recusado") return "text-red-600"

    return "text-muted-foreground"
  }

  function podePrestadorAdicionarAcrescimo(agendamento: AgendamentoItem) {
    return (
      agendamento.papel_usuario_logado === "prestador" &&
      agendamento.servico_etapa_id !== null &&
      agendamento.servico_etapa_id >= 2 &&
      agendamento.servico_etapa_id <= 5
    )
  }

  function abrirFormularioNovoAcrescimo(agendamentoId: number) {
    setFormAcrescimoAbertoId(agendamentoId)
    setAcrescimoEditandoId(null)
    setTituloAcrescimo("")
    setDescricaoAcrescimo("")
    setValorAcrescimo("")
    setErro(null)
  }

  function abrirFormularioEditarAcrescimo(
    agendamentoId: number,
    acrescimo: AcrescimoAgendamento
  ) {
    if (acrescimo.status === "aceito") {
      return
    }

    setFormAcrescimoAbertoId(agendamentoId)
    setAcrescimoEditandoId(acrescimo.id)
    setTituloAcrescimo(acrescimo.titulo ?? "")
    setDescricaoAcrescimo(acrescimo.descricao ?? "")
    setValorAcrescimo(
      acrescimo.valor !== null && acrescimo.valor !== undefined
        ? String(acrescimo.valor).replace(".", ",")
        : ""
    )
    setErro(null)
  }

  function fecharFormularioAcrescimo() {
    setFormAcrescimoAbertoId(null)
    setAcrescimoEditandoId(null)
    setTituloAcrescimo("")
    setDescricaoAcrescimo("")
    setValorAcrescimo("")
    setErro(null)
  }

  function abrirFormularioCheckout(agendamentoId: number) {
    setFormCheckoutAbertoId(agendamentoId)
    setCheckoutFotos([])
    setErro(null)
  }

  function fecharFormularioCheckout() {
    setFormCheckoutAbertoId(null)
    setCheckoutFotos([])
    setErro(null)
  }

  function abrirFormularioAvaliacao(agendamentoId: number) {
    setFormAvaliacaoAbertoId(agendamentoId)
    setNotaAvaliacao(0)
    setTituloAvaliacao("")
    setComentarioAvaliacao("")
    setMidiasAvaliacao([])
    setErro(null)
  }

  function fecharFormularioAvaliacao() {
    setFormAvaliacaoAbertoId(null)
    setNotaAvaliacao(0)
    setTituloAvaliacao("")
    setComentarioAvaliacao("")
    setMidiasAvaliacao([])
    setErro(null)
  }

  async function handleSalvarAcrescimo(
    event: React.FormEvent<HTMLFormElement>,
    agendamento: AgendamentoItem
  ) {
    event.preventDefault()

    if (!usuarioId) return

    if (!tituloAcrescimo.trim()) {
      setErro("Informe o título do acréscimo.")
      return
    }

    const valorNormalizado = valorAcrescimo.replace(",", ".")
    const valorConvertido = Number(valorNormalizado)

    if (!valorAcrescimo.trim()) {
      setErro("Informe o valor do acréscimo.")
      return
    }

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      setErro("Informe um valor válido para o acréscimo.")
      return
    }

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await criarOuAtualizarAcrescimoAgendamento({
        acrescimoId: acrescimoEditandoId,
        servicoSolicitadoId: agendamento.id,
        prestadorId: usuarioId,
        titulo: tituloAcrescimo.trim(),
        descricao: descricaoAcrescimo.trim(),
        valor: valorConvertido,
      })

      fecharFormularioAcrescimo()
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar acréscimo."
      )
    }

    setProcessandoId(null)
  }

  async function handleAceitarAcrescimo(acrescimo: AcrescimoAgendamento) {
    if (!usuarioId) return

    setProcessandoId(acrescimo.id)
    setErro(null)

    try {
      await aceitarAcrescimoAgendamento(acrescimo.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao aceitar acréscimo."
      )
    }

    setProcessandoId(null)
  }

  async function handleRecusarAcrescimo(acrescimo: AcrescimoAgendamento) {
    if (!usuarioId) return

    setProcessandoId(acrescimo.id)
    setErro(null)

    try {
      await recusarAcrescimoAgendamento(acrescimo.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao recusar acréscimo."
      )
    }

    setProcessandoId(null)
  }

  async function handleExcluirAcrescimo(acrescimo: AcrescimoAgendamento) {
    if (!usuarioId) return

    const confirmarExclusao = window.confirm(
      "Tem certeza que deseja excluir este acréscimo?"
    )

    if (!confirmarExclusao) return

    setProcessandoId(acrescimo.id)
    setErro(null)

    try {
      await excluirAcrescimoAgendamento(acrescimo.id, usuarioId)

      if (acrescimoEditandoId === acrescimo.id) {
        fecharFormularioAcrescimo()
      }

      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao excluir acréscimo."
      )
    }

    setProcessandoId(null)
  }

  async function handleSolicitarCheckin(agendamento: AgendamentoItem) {
    if (!usuarioId) return

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await solicitarCheckinAgendamento(agendamento.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao solicitar check-in."
      )
    }

    setProcessandoId(null)
  }

  async function handleConfirmarCheckin(agendamento: AgendamentoItem) {
    if (!usuarioId) return

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await confirmarCheckinAgendamento(agendamento.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao confirmar check-in."
      )
    }

    setProcessandoId(null)
  }

  async function handleSolicitarCheckout(
    event: React.FormEvent<HTMLFormElement>,
    agendamento: AgendamentoItem
  ) {
    event.preventDefault()

    if (!usuarioId) return

    if (checkoutFotos.length === 0) {
      setErro("Anexe pelo menos uma foto do serviço.")
      return
    }

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await solicitarCheckoutAgendamento({
        servicoSolicitadoId: agendamento.id,
        prestadorId: usuarioId,
        fotos: checkoutFotos,
      })

      fecharFormularioCheckout()
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao solicitar checkout."
      )
    }

    setProcessandoId(null)
  }

  async function handleConfirmarCheckout(
    event: React.FormEvent<HTMLFormElement>,
    agendamento: AgendamentoItem
  ) {
    event.preventDefault()

    if (!usuarioId) return

    if (notaAvaliacao < 1 || notaAvaliacao > 5) {
      setErro("Selecione uma avaliação de 1 a 5 estrelas.")
      return
    }

    if (!tituloAvaliacao.trim()) {
      setErro("Informe um título para a avaliação.")
      return
    }

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await confirmarCheckoutAgendamento(
        agendamento.id,
        usuarioId,
        notaAvaliacao,
        tituloAvaliacao.trim(),
        comentarioAvaliacao.trim(),
        midiasAvaliacao
      )

      fecharFormularioAvaliacao()
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao confirmar checkout."
      )
    }

    setProcessandoId(null)
  }

  const agendamentosEmAndamento = agendamentos.filter(
    (agendamento) => agendamento.servico_etapa_id !== 9
  )

  const agendamentosFinalizados = agendamentos.filter(
    (agendamento) => agendamento.servico_etapa_id === 9
  )

  const agendamentosExibidos =
    abaAtiva === "agendamentos"
      ? agendamentosEmAndamento
      : agendamentosFinalizados

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando agendamentos...</p>
      </section>
    )
  }

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold md:text-3xl">Agendamentos</h1>

          <p className="text-sm text-muted-foreground md:text-base">
            Acompanhe os serviços confirmados, em andamento e finalizados.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-md rounded-2xl border border-gray-300 bg-background p-1">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva("agendamentos")
              fecharFormularioAcrescimo()
              fecharFormularioCheckout()
              fecharFormularioAvaliacao()
            }}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition ${
              abaAtiva === "agendamentos"
                ? "bg-blue-950 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Agendamentos ({agendamentosEmAndamento.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva("finalizados")
              fecharFormularioAcrescimo()
              fecharFormularioCheckout()
              fecharFormularioAvaliacao()
            }}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition ${
              abaAtiva === "finalizados"
                ? "bg-blue-950 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Finalizados ({agendamentosFinalizados.length})
          </button>
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        {agendamentosExibidos.length > 0 ? (
          <div className="flex flex-col gap-4">
            {agendamentosExibidos.map((agendamento) => {
              const outroNome =
                agendamento.papel_usuario_logado === "prestador"
                  ? agendamento.cliente_nome
                  : agendamento.prestador_nome

              const outroFoto =
                agendamento.papel_usuario_logado === "prestador"
                  ? agendamento.cliente_foto
                  : agendamento.prestador_foto

              const usuarioEhPrestador =
                agendamento.papel_usuario_logado === "prestador"

              const usuarioEhCliente =
                agendamento.papel_usuario_logado === "cliente"

              const etapaConfirmada = agendamento.servico_etapa_id === 2
              const etapaEmAberto = agendamento.servico_etapa_id === 3
              const etapaEmExecucao = agendamento.servico_etapa_id === 4
              const etapaAguardandoCheckout = agendamento.servico_etapa_id === 5
              const etapaFinalizada = agendamento.servico_etapa_id === 9

              const linkPerfilPrestador =
                usuarioEhCliente && agendamento.prestador_id
                  ? agendamento.servico_id
                    ? `/prestadores/${agendamento.prestador_id}?servicoId=${agendamento.servico_id}`
                    : `/prestadores/${agendamento.prestador_id}`
                  : null

              return (
                <article
                  key={agendamento.id}
                  className="rounded-3xl border border-gray-300 bg-background p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      {linkPerfilPrestador ? (
                        <Link
                          href={linkPerfilPrestador}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-300 bg-muted transition hover:opacity-80"
                        >
                          {outroFoto ? (
                            <Image
                              src={outroFoto}
                              alt={`Foto de ${outroNome ?? "prestador"}`}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <CalendarCheck className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                        </Link>
                      ) : (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-300 bg-muted">
                          {outroFoto ? (
                            <Image
                              src={outroFoto}
                              alt={`Foto de ${outroNome ?? "usuário"}`}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <CalendarCheck className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold">
                          {agendamento.servico_nome ?? "Serviço não informado"}
                        </h2>

                        <p className="text-sm text-muted-foreground">
                          {usuarioEhPrestador ? "Cliente" : "Prestador"}:{" "}
                          <span className="font-semibold">
                            {outroNome ?? "Usuário sem nome"}
                          </span>
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Data: {formatarData(agendamento.data_agendada)}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Valor: {formatarValor(agendamento.valor_final)}
                        </p>

                        <p className="text-sm font-semibold">
                          Status:{" "}
                          {getStatus(
                            agendamento.servico_etapa_id,
                            agendamento.etapa_nome
                          )}
                        </p>

                        {agendamento.inicio && (
                          <p className="text-sm text-muted-foreground">
                            Início: {formatarData(agendamento.inicio)}
                          </p>
                        )}

                        {agendamento.fim && (
                          <p className="text-sm text-muted-foreground">
                            Fim: {formatarData(agendamento.fim)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      {usuarioEhPrestador && etapaConfirmada && (
                        <button
                          type="button"
                          onClick={() => handleSolicitarCheckin(agendamento)}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          {processandoId === agendamento.id
                            ? "Solicitando..."
                            : "Solicitar check-in"}
                        </button>
                      )}

                      {usuarioEhCliente && etapaEmAberto && (
                        <button
                          type="button"
                          onClick={() => handleConfirmarCheckin(agendamento)}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          {processandoId === agendamento.id
                            ? "Confirmando..."
                            : "Confirmar check-in"}
                        </button>
                      )}

                      {usuarioEhCliente && etapaEmExecucao && (
                        <span className="rounded-xl bg-muted px-4 py-2 text-sm font-bold">
                          Serviço em execução
                        </span>
                      )}

                      {usuarioEhPrestador && etapaEmExecucao && (
                        <button
                          type="button"
                          onClick={() => abrirFormularioCheckout(agendamento.id)}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900"
                        >
                          Solicitar checkout
                        </button>
                      )}

                      {usuarioEhCliente && etapaAguardandoCheckout && (
                        <button
                          type="button"
                          onClick={() => abrirFormularioAvaliacao(agendamento.id)}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          Confirmar checkout
                        </button>
                      )}

                      {etapaFinalizada && (
                        <span className="rounded-xl bg-muted px-4 py-2 text-sm font-bold">
                          Serviço finalizado
                        </span>
                      )}

                      {podePrestadorAdicionarAcrescimo(agendamento) && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirFormularioNovoAcrescimo(agendamento.id)
                          }
                          className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold transition hover:bg-muted"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar acréscimo
                        </button>
                      )}
                    </div>
                  </div>

                  {usuarioEhPrestador && agendamento.endereco_cliente && (
                    <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                        <div>
                          <p className="text-sm font-bold">
                            Endereço do cliente
                          </p>

                          <p className="text-sm text-muted-foreground">
                            {agendamento.endereco_cliente}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {agendamento.observacoes && (
                    <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-bold">Observações</p>

                      <p className="text-sm text-muted-foreground">
                        {agendamento.observacoes}
                      </p>
                    </div>
                  )}

                  {agendamento.acrescimos.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-bold">Acréscimos</p>

                      <div className="mt-3 flex flex-col gap-2">
                        {agendamento.acrescimos.map((acrescimo) => {
                          const acrescimoPendente =
                            acrescimo.status === "pendente"
                          const acrescimoRecusado =
                            acrescimo.status === "recusado"
                          const podeEditarAcrescimo =
                            usuarioEhPrestador &&
                            acrescimo.status !== "aceito"

                          return (
                            <div
                              key={acrescimo.id}
                              role={podeEditarAcrescimo ? "button" : undefined}
                              tabIndex={podeEditarAcrescimo ? 0 : undefined}
                              onClick={() => {
                                if (podeEditarAcrescimo) {
                                  abrirFormularioEditarAcrescimo(
                                    agendamento.id,
                                    acrescimo
                                  )
                                }
                              }}
                              onKeyDown={(event) => {
                                if (
                                  podeEditarAcrescimo &&
                                  event.key === "Enter"
                                ) {
                                  abrirFormularioEditarAcrescimo(
                                    agendamento.id,
                                    acrescimo
                                  )
                                }
                              }}
                              className={`rounded-xl border border-gray-200 p-3 ${
                                podeEditarAcrescimo
                                  ? "cursor-pointer transition hover:bg-muted"
                                  : ""
                              }`}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-sm font-bold">
                                    {acrescimo.titulo ?? "Acréscimo"}
                                  </p>

                                  {acrescimo.descricao && (
                                    <p className="text-sm text-muted-foreground">
                                      {acrescimo.descricao}
                                    </p>
                                  )}

                                  <p className="text-sm font-semibold">
                                    {formatarValor(acrescimo.valor)}
                                  </p>

                                  <p
                                    className={`text-xs font-semibold ${getClasseStatusAcrescimo(
                                      acrescimo.status
                                    )}`}
                                  >
                                    Status: {acrescimo.status ?? "pendente"}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-2 md:items-end">
                                  {usuarioEhCliente && acrescimoPendente && (
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleAceitarAcrescimo(acrescimo)
                                        }}
                                        disabled={
                                          processandoId === acrescimo.id
                                        }
                                        className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                                      >
                                        {processandoId === acrescimo.id
                                          ? "Aceitando..."
                                          : "Aceitar acréscimo"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleRecusarAcrescimo(acrescimo)
                                        }}
                                        disabled={
                                          processandoId === acrescimo.id
                                        }
                                        className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                      >
                                        {processandoId === acrescimo.id
                                          ? "Recusando..."
                                          : "Recusar"}
                                      </button>
                                    </div>
                                  )}

                                  {usuarioEhPrestador && acrescimoRecusado && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleExcluirAcrescimo(acrescimo)
                                      }}
                                      disabled={processandoId === acrescimo.id}
                                      className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                    >
                                      {processandoId === acrescimo.id
                                        ? "Excluindo..."
                                        : "Excluir"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {formAvaliacaoAbertoId === agendamento.id && (
                    <form
                      onSubmit={(event) =>
                        handleConfirmarCheckout(event, agendamento)
                      }
                      className="mt-4 rounded-2xl border border-gray-300 bg-muted/30 p-4"
                    >
                      <div className="mb-4">
                        <h3 className="text-sm font-bold">Avaliar serviço</h3>

                        <p className="text-xs text-muted-foreground">
                          Antes de finalizar, avalie o serviço prestado.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold">Nota</p>

                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((estrela) => (
                            <button
                              key={estrela}
                              type="button"
                              onClick={() => {
                                setNotaAvaliacao(estrela)
                                setErro(null)
                              }}
                              className={`text-3xl transition ${
                                estrela <= notaAvaliacao
                                  ? "text-yellow-500"
                                  : "text-gray-300"
                              }`}
                              aria-label={`Avaliar com ${estrela} estrela${
                                estrela > 1 ? "s" : ""
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>

                        {notaAvaliacao > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Avaliação selecionada: {notaAvaliacao} estrela
                            {notaAvaliacao > 1 ? "s" : ""}
                          </p>
                        )}

                        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
                          Título da avaliação
                          <input
                            value={tituloAvaliacao}
                            onChange={(event) =>
                              setTituloAvaliacao(event.target.value)
                            }
                            placeholder="Ex: Ótimo atendimento"
                            className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                          />
                        </label>

                        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
                          Comentário
                          <textarea
                            value={comentarioAvaliacao}
                            onChange={(event) =>
                              setComentarioAvaliacao(event.target.value)
                            }
                            placeholder="Conte como foi sua experiência com o serviço..."
                            className="min-h-24 resize-none rounded-xl border border-gray-300 bg-background p-3 text-sm outline-none"
                          />
                        </label>

                        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
                          Fotos ou vídeos
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={(event) =>
                              setMidiasAvaliacao(
                                Array.from(event.target.files ?? [])
                              )
                            }
                            className="rounded-xl border border-gray-300 bg-background p-3 text-sm"
                          />
                        </label>

                        {midiasAvaliacao.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {midiasAvaliacao.length} arquivo(s) selecionado(s).
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={fecharFormularioAvaliacao}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold transition hover:bg-muted disabled:opacity-60"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          {processandoId === agendamento.id
                            ? "Finalizando..."
                            : "Enviar avaliação e finalizar"}
                        </button>
                      </div>
                    </form>
                  )}

                  {formCheckoutAbertoId === agendamento.id && (
                    <form
                      onSubmit={(event) =>
                        handleSolicitarCheckout(event, agendamento)
                      }
                      className="mt-4 rounded-2xl border border-gray-300 bg-muted/30 p-4"
                    >
                      <div className="mb-4">
                        <h3 className="text-sm font-bold">
                          Solicitar checkout
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          Anexe fotos do serviço para registrar a conclusão.
                        </p>
                      </div>

                      <label className="flex flex-col gap-2 text-sm font-semibold">
                        Fotos do serviço
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) =>
                            setCheckoutFotos(
                              Array.from(event.target.files ?? [])
                            )
                          }
                          className="rounded-xl border border-gray-300 bg-background p-3 text-sm"
                        />
                      </label>

                      {checkoutFotos.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {checkoutFotos.length} foto(s) selecionada(s).
                        </p>
                      )}

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={fecharFormularioCheckout}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold transition hover:bg-muted disabled:opacity-60"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={processandoId === agendamento.id}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          <Upload className="h-4 w-4" />
                          {processandoId === agendamento.id
                            ? "Enviando..."
                            : "Enviar checkout"}
                        </button>
                      </div>
                    </form>
                  )}

                  {formAcrescimoAbertoId === agendamento.id && (
                    <form
                      onSubmit={(event) =>
                        handleSalvarAcrescimo(event, agendamento)
                      }
                      className="mt-4 rounded-2xl border border-gray-300 bg-muted/30 p-4"
                    >
                      <div className="mb-4">
                        <h3 className="text-sm font-bold">
                          {acrescimoEditandoId
                            ? "Editar acréscimo"
                            : "Novo acréscimo"}
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          O cliente precisará aceitar o acréscimo.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                          Título
                          <input
                            value={tituloAcrescimo}
                            onChange={(event) =>
                              setTituloAcrescimo(event.target.value)
                            }
                            placeholder="Ex: Material adicional"
                            className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-sm font-semibold">
                          Valor
                          <input
                            type="text"
                            inputMode="decimal"
                            value={valorAcrescimo}
                            onChange={(event) =>
                              setValorAcrescimo(event.target.value)
                            }
                            placeholder="Ex: 80,00"
                            className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
                          Descrição
                          <textarea
                            value={descricaoAcrescimo}
                            onChange={(event) =>
                              setDescricaoAcrescimo(event.target.value)
                            }
                            placeholder="Descreva o motivo do acréscimo..."
                            className="min-h-24 resize-none rounded-xl border border-gray-300 bg-background p-3 text-sm outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={fecharFormularioAcrescimo}
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold transition hover:bg-muted disabled:opacity-60"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={processandoId === agendamento.id}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          {processandoId === agendamento.id
                            ? "Salvando..."
                            : "Salvar acréscimo"}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-300 p-8 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />

            <p className="font-semibold">
              {abaAtiva === "agendamentos"
                ? "Nenhum agendamento em andamento."
                : "Nenhum serviço finalizado."}
            </p>

            <p className="max-w-md text-sm text-muted-foreground">
              {abaAtiva === "agendamentos"
                ? "Os serviços confirmados pelo cliente aparecerão aqui."
                : "Quando um serviço for finalizado, ele aparecerá neste histórico."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}