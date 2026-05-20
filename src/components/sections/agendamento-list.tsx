"use client"

import * as React from "react"
import Image from "next/image"
import { CalendarCheck, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  confirmarCheckinAgendamento,
  getAgendamentosDoUsuarioLogado,
  solicitarCheckinAgendamento,
  type AgendamentoItem,
} from "@/services/agendamento-service"

export default function AgendamentosLista() {
  const supabase = React.useMemo(() => createClient(), [])

  const [usuarioId, setUsuarioId] = React.useState<number | null>(null)
  const [agendamentos, setAgendamentos] = React.useState<AgendamentoItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [processandoId, setProcessandoId] = React.useState<number | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

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
    if (etapaId === 2) {
      return "Confirmado"
    }

    if (etapaId === 3) {
      return "Em execução"
    }

    if (etapaId === 4) {
      return "Concluído"
    }

    return etapaNome ?? "Status não informado"
  }

  async function handleSolicitarCheckin(agendamento: AgendamentoItem) {
    if (!usuarioId) {
      return
    }

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await solicitarCheckinAgendamento(agendamento.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao solicitar check-in."
      )
    }

    setProcessandoId(null)
  }

  async function handleConfirmarCheckin(agendamento: AgendamentoItem) {
    if (!usuarioId) {
      return
    }

    setProcessandoId(agendamento.id)
    setErro(null)

    try {
      await confirmarCheckinAgendamento(agendamento.id, usuarioId)
      await carregarAgendamentos()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao confirmar check-in."
      )
    }

    setProcessandoId(null)
  }

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
            Acompanhe os serviços confirmados e em andamento.
          </p>
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        {agendamentos.length > 0 ? (
          <div className="flex flex-col gap-4">
            {agendamentos.map((agendamento) => {
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
              const etapaEmExecucao = agendamento.servico_etapa_id === 3

              return (
                <article
                  key={agendamento.id}
                  className="rounded-3xl border border-gray-300 bg-background p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
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

                      {usuarioEhCliente && etapaConfirmada && (
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

                      {etapaEmExecucao && (
                        <span className="rounded-xl bg-muted px-4 py-2 text-sm font-bold">
                          Serviço em execução
                        </span>
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
                </article>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-300 p-8 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />

            <p className="font-semibold">Nenhum agendamento encontrado.</p>

            <p className="max-w-md text-sm text-muted-foreground">
              Os serviços confirmados pelo cliente aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}