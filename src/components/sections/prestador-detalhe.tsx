"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpDown, ChevronDown, ChevronUp, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  atualizarValorMedioPrestadorNoServico,
  excluirPrestadorDoServico,
} from "@/services/servico-prestador-service"
import {
  getAvaliacoesPorPrestador,
  getMediasAvaliacoesServicosDoPrestador,
  getPrestadorDetalhe,
  getServicosDoPrestador,
  type AvaliacaoPrestadorData,
  type MediaServicoPrestadorData,
  type PrestadorDetalheData,
  type ServicoPrestadorPerfilData,
} from "@/services/prestador-service"

type PrestadorDetalheProps = {
  prestadorId: number
  servicoId?: number | null
}

type TipoOrdenacao = "cronologica" | "nota" | "servico"

type MidiaAvaliacao = {
  url: string
  tipo: string
  nome: string
}

export default function PrestadorDetalhe({
  prestadorId,
  servicoId = null,
}: PrestadorDetalheProps) {
  const supabase = React.useMemo(() => createClient(), [])

  const [prestador, setPrestador] = React.useState<PrestadorDetalheData | null>(
    null
  )

  const [avaliacoes, setAvaliacoes] = React.useState<AvaliacaoPrestadorData[]>(
    []
  )

  const [servicosPrestador, setServicosPrestador] = React.useState<
    ServicoPrestadorPerfilData[]
  >([])

  const [avaliacoesPorServico, setAvaliacoesPorServico] = React.useState<
    MediaServicoPrestadorData[]
  >([])

  const [usuarioLogadoId, setUsuarioLogadoId] = React.useState<number | null>(
    null
  )

  const [servicoEditandoId, setServicoEditandoId] = React.useState<
    number | null
  >(null)
  const [valorMedioEditando, setValorMedioEditando] = React.useState("")
  const [salvandoServico, setSalvandoServico] = React.useState(false)

  const [ordenacao, setOrdenacao] =
    React.useState<TipoOrdenacao>("cronologica")
  const [ordemAscendente, setOrdemAscendente] = React.useState(false)

  const [avaliacoesAbertas, setAvaliacoesAbertas] = React.useState<number[]>(
    []
  )

  const [loading, setLoading] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)

  const usuarioEhDonoDoPerfil = usuarioLogadoId === prestadorId

  const carregarDados = React.useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let usuarioId: number | null = null

      if (user) {
        const { data: perfil, error: perfilError } = await supabase
          .from("user")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle()

        if (perfilError) {
          throw new Error(perfilError.message)
        }

        usuarioId = perfil?.id ?? null
      }

      const [
        prestadorData,
        avaliacoesData,
        servicosPrestadorData,
        avaliacoesPorServicoData,
      ] = await Promise.all([
        getPrestadorDetalhe(prestadorId),
        getAvaliacoesPorPrestador(prestadorId),
        getServicosDoPrestador(prestadorId),
        getMediasAvaliacoesServicosDoPrestador(prestadorId),
      ])

      setUsuarioLogadoId(usuarioId)
      setPrestador(prestadorData)
      setAvaliacoes(avaliacoesData)
      setServicosPrestador(servicosPrestadorData)
      setAvaliacoesPorServico(avaliacoesPorServicoData)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados do prestador."
      )
    }

    setLoading(false)
  }, [prestadorId, supabase])

  React.useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const avaliacoesValidas = React.useMemo(() => {
    return avaliacoes.filter((avaliacao) => avaliacao.nota !== null)
  }, [avaliacoes])

  const totalAvaliacoes = avaliacoesValidas.length

  const mediaAvaliacoes = React.useMemo(() => {
    if (totalAvaliacoes === 0) {
      return 0
    }

    const soma = avaliacoesValidas.reduce(
      (total, avaliacao) => total + Number(avaliacao.nota),
      0
    )

    return soma / totalAvaliacoes
  }, [avaliacoesValidas, totalAvaliacoes])

  const avaliacoesOrdenadas = React.useMemo(() => {
    const lista = [...avaliacoes]

    lista.sort((a, b) => {
      if (ordenacao === "cronologica") {
        const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dataB = b.created_at ? new Date(b.created_at).getTime() : 0

        return ordemAscendente ? dataA - dataB : dataB - dataA
      }

      if (ordenacao === "nota") {
        const notaA = Number(a.nota ?? 0)
        const notaB = Number(b.nota ?? 0)

        return ordemAscendente ? notaA - notaB : notaB - notaA
      }

      const servicoA = a.servico_nome ?? ""
      const servicoB = b.servico_nome ?? ""

      return ordemAscendente
        ? servicoA.localeCompare(servicoB)
        : servicoB.localeCompare(servicoA)
    })

    return lista
  }, [avaliacoes, ordenacao, ordemAscendente])

  const servicosPrestadorOrdenados = React.useMemo(() => {
    return [...servicosPrestador].sort((a, b) =>
      a.servico_nome.localeCompare(b.servico_nome)
    )
  }, [servicosPrestador])

  const avaliacoesPorServicoOrdenadas = React.useMemo(() => {
    return [...avaliacoesPorServico].sort((a, b) =>
      a.servico_nome.localeCompare(b.servico_nome)
    )
  }, [avaliacoesPorServico])

  function renderEstrelas(media: number, tamanho: "sm" | "md" = "md") {
    const mediaArredondada = Math.round(media)

    return Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        className={`${tamanho === "sm" ? "text-lg" : "text-2xl"} leading-none`}
      >
        {index < mediaArredondada ? "★" : "☆"}
      </span>
    ))
  }

  function formatarMedia(media: number) {
    return media.toFixed(1).replace(".", ",")
  }

  function formatarValor(valor: number | null) {
    if (valor === null) {
      return "Valor não informado"
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  function formatarData(data: string | null) {
    if (!data) {
      return "Não informado"
    }

    return new Intl.DateTimeFormat("pt-BR").format(new Date(data))
  }

  function formatarTelefone(telefone: string | null) {
    if (!telefone) {
      return "Não informado"
    }

    const numeros = telefone.replace(/\D/g, "")

    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(
        7
      )}`
    }

    if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(
        6
      )}`
    }

    return telefone
  }

  function getTextoOrdenacao() {
    if (ordenacao === "cronologica") {
      return ordemAscendente ? "mais antigas primeiro" : "mais recentes primeiro"
    }

    if (ordenacao === "nota") {
      return ordemAscendente ? "menor nota primeiro" : "maior nota primeiro"
    }

    return ordemAscendente ? "serviço A-Z" : "serviço Z-A"
  }

  function parseMidias(midia: string | null | undefined): MidiaAvaliacao[] {
    if (!midia) {
      return []
    }

    try {
      const parsed = JSON.parse(midia)

      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.filter((item) => {
        return (
          item &&
          typeof item.url === "string" &&
          typeof item.tipo === "string" &&
          typeof item.nome === "string"
        )
      })
    } catch {
      return []
    }
  }

  function midiaEhVideo(tipo: string) {
    return tipo.startsWith("video/")
  }

  function midiaEhImagem(tipo: string) {
    return tipo.startsWith("image/")
  }

  function avaliacaoEstaAberta(avaliacaoId: number) {
    return avaliacoesAbertas.includes(avaliacaoId)
  }

  function alternarAvaliacao(avaliacaoId: number) {
    setAvaliacoesAbertas((idsAtuais) => {
      if (idsAtuais.includes(avaliacaoId)) {
        return idsAtuais.filter((id) => id !== avaliacaoId)
      }

      return [...idsAtuais, avaliacaoId]
    })
  }

  function avaliacaoPodeExpandir(avaliacao: AvaliacaoPrestadorData) {
    const possuiComentario = !!avaliacao.comentario?.trim()
    const possuiMidia = parseMidias(avaliacao.midia).length > 0

    return possuiComentario || possuiMidia
  }

  function iniciarEdicaoServico(servico: ServicoPrestadorPerfilData) {
    setErro(null)
    setServicoEditandoId(servico.servico_id)
    setValorMedioEditando(
      servico.valor_medio !== null
        ? String(servico.valor_medio).replace(".", ",")
        : ""
    )
  }

  function cancelarEdicaoServico() {
    setServicoEditandoId(null)
    setValorMedioEditando("")
    setErro(null)
  }

  async function handleSalvarValorServico(servico: ServicoPrestadorPerfilData) {
    const valorNormalizado = valorMedioEditando.replace(",", ".")
    const valorConvertido = Number(valorNormalizado)

    if (!valorMedioEditando.trim()) {
      setErro("Informe o valor médio do serviço.")
      return
    }

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      setErro("Informe um valor médio válido para o serviço.")
      return
    }

    setSalvandoServico(true)
    setErro(null)

    try {
      await atualizarValorMedioPrestadorNoServico(
        servico.servico_id,
        prestadorId,
        valorConvertido
      )

      setServicoEditandoId(null)
      setValorMedioEditando("")
      await carregarDados()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar valor do serviço."
      )
    }

    setSalvandoServico(false)
  }

  async function handleExcluirServico(servico: ServicoPrestadorPerfilData) {
    const confirmarExclusao = window.confirm(
      "Tem certeza que deseja remover este serviço do seu catálogo?"
    )

    if (!confirmarExclusao) {
      return
    }

    setSalvandoServico(true)
    setErro(null)

    try {
      await excluirPrestadorDoServico(servico.servico_id, prestadorId)

      if (servicoEditandoId === servico.servico_id) {
        cancelarEdicaoServico()
      }

      await carregarDados()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao excluir serviço do prestador."
      )
    }

    setSalvandoServico(false)
  }

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando prestador...</p>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      </section>
    )
  }

  if (!prestador) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Prestador não encontrado.</p>
      </section>
    )
  }

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <div className="rounded-3xl border border-gray-300 bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex flex-col items-center gap-3 md:w-64">
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border-2 border-gray-300 bg-muted">
                {prestador.foto ? (
                  <Image
                    src={prestador.foto}
                    alt={`Foto de ${prestador.nome ?? "prestador"}`}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                    Foto
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold">
                  {prestador.nome ?? "Prestador sem nome"}
                </h1>

                <p className="text-sm text-muted-foreground">
                  Desde {formatarData(prestador.created_at)}
                </p>
              </div>

              <Link
                href={
                  servicoId
                    ? `/prestadores/${prestador.id}/contato?servicoId=${servicoId}`
                    : `/prestadores/${prestador.id}/contato`
                }
                className="mt-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
              >
                Solicitar serviço
              </Link>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <InfoItem label="Nome" value={prestador.nome} />

              <InfoItem
                label="Data de nascimento"
                value={formatarData(prestador.data_nascimento)}
              />

              <InfoItem
                label="Telefone"
                value={formatarTelefone(prestador.telefone)}
              />

              <InfoItem label="Email" value={prestador.email} />

              <InfoItem label="Cidade" value={prestador.cidade} />

              <InfoItem label="Estado" value={prestador.estado} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-background p-6 shadow-sm">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold">Serviços prestados</h2>

            <p className="text-sm text-muted-foreground">
              Serviços que este prestador oferece pela plataforma.
            </p>
          </div>

          {servicosPrestadorOrdenados.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servicosPrestadorOrdenados.map((servico) => {
                const estaEditando = servicoEditandoId === servico.servico_id

                return (
                  <div
                    key={servico.id}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <p className="font-bold">{servico.servico_nome}</p>

                    {!estaEditando ? (
                      <>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Valor médio
                        </p>

                        <p className="text-sm font-bold">
                          {formatarValor(servico.valor_medio)}
                        </p>

                        {usuarioEhDonoDoPerfil && (
                          <div className="mt-4 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => iniciarEdicaoServico(servico)}
                              disabled={salvandoServico}
                              className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                            >
                              Editar valor
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExcluirServico(servico)}
                              disabled={salvandoServico}
                              className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              Excluir serviço
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-3 flex flex-col gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valorMedioEditando}
                          onChange={(event) =>
                            setValorMedioEditando(event.target.value)
                          }
                          placeholder="Ex: 200,00"
                          className="h-10 rounded-xl border border-gray-300 bg-background px-3 text-sm outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleSalvarValorServico(servico)}
                          disabled={salvandoServico}
                          className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                        >
                          {salvandoServico ? "Salvando..." : "Salvar valor"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirServico(servico)}
                          disabled={salvandoServico}
                          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Excluir serviço
                        </button>

                        <button
                          type="button"
                          onClick={cancelarEdicaoServico}
                          disabled={salvandoServico}
                          className="text-sm font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Este prestador ainda não possui serviços cadastrados.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-gray-300 bg-background p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold">Avaliações do prestador</h2>

            <p className="text-sm text-muted-foreground">
              Média geral e média por serviço.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-4 text-center">
              <p className="font-bold">Geral</p>

              <div className="mt-3 flex justify-center text-foreground">
                {renderEstrelas(mediaAvaliacoes, "sm")}
              </div>

              <p className="mt-2 text-sm font-semibold">
                Média {formatarMedia(mediaAvaliacoes)} de 5
              </p>

              <p className="text-sm text-muted-foreground">
                {totalAvaliacoes} avaliaç
                {totalAvaliacoes === 1 ? "ão" : "ões"}
              </p>
            </div>

            {avaliacoesPorServicoOrdenadas.map((servico) => (
              <div
                key={servico.servico_id}
                className="rounded-2xl border border-gray-200 p-4 text-center"
              >
                <p className="font-bold">{servico.servico_nome}</p>

                <div className="mt-3 flex justify-center text-foreground">
                  {renderEstrelas(servico.media_avaliacoes, "sm")}
                </div>

                <p className="mt-2 text-sm font-semibold">
                  Média {formatarMedia(servico.media_avaliacoes)} de 5
                </p>

                <p className="text-sm text-muted-foreground">
                  {servico.total_avaliacoes} avaliaç
                  {servico.total_avaliacoes === 1 ? "ão" : "ões"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-background p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Lista de avaliações</h2>
              <p className="text-sm text-muted-foreground">
                Ordenando por {getTextoOrdenacao()}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Ordenar por
                <select
                  value={ordenacao}
                  onChange={(event) =>
                    setOrdenacao(event.target.value as TipoOrdenacao)
                  }
                  className="h-10 rounded-xl border border-gray-300 bg-background px-3 text-sm"
                >
                  <option value="cronologica">Ordem cronológica</option>
                  <option value="nota">Nota</option>
                  <option value="servico">Serviço</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setOrdemAscendente((valorAtual) => !valorAtual)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold transition hover:bg-muted sm:self-end"
              >
                <ArrowUpDown className="h-4 w-4" />
                Inverter
              </button>
            </div>
          </div>

          {avaliacoesOrdenadas.length > 0 ? (
            <div className="flex flex-col gap-4">
              {avaliacoesOrdenadas.map((avaliacao) => {
                const midias = parseMidias(avaliacao.midia)
                const aberta = avaliacaoEstaAberta(avaliacao.id)
                const podeExpandir = avaliacaoPodeExpandir(avaliacao)

                return (
                  <div
                    key={avaliacao.id}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-lg font-bold">
                            {avaliacao.titulo || "Avaliação sem título"}
                          </p>

                          <p className="text-sm font-semibold text-muted-foreground">
                            Serviço:{" "}
                            <span className="text-foreground">
                              {avaliacao.servico_nome ??
                                "Serviço não informado"}
                            </span>
                          </p>

                          <p className="text-sm text-muted-foreground">
                            Data: {formatarData(avaliacao.created_at)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex text-lg">
                              {renderEstrelas(
                                Number(avaliacao.nota ?? 0),
                                "sm"
                              )}
                            </div>

                            <span className="text-sm font-bold">
                              {avaliacao.nota ?? 0}/5
                            </span>
                          </div>

                          {podeExpandir && (
                            <button
                              type="button"
                              onClick={() => alternarAvaliacao(avaliacao.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 transition hover:bg-muted"
                              aria-label={
                                aberta
                                  ? "Minimizar avaliação"
                                  : "Expandir avaliação"
                              }
                            >
                              {aberta ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {aberta && podeExpandir && (
                        <div className="flex flex-col gap-4">
                          {avaliacao.comentario ? (
                            <div className="rounded-2xl bg-muted/40 p-4">
                              <p className="text-sm font-bold">Comentário</p>

                              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                {avaliacao.comentario}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhum comentário informado.
                            </p>
                          )}

                          {midias.length > 0 && (
                            <div className="flex flex-col gap-3">
                              <p className="text-sm font-bold">
                                Mídias anexadas
                              </p>

                              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {midias.map((midia, index) => (
                                  <a
                                    key={`${midia.url}-${index}`}
                                    href={midia.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-muted"
                                  >
                                    {midiaEhImagem(midia.tipo) ? (
                                      <div className="relative h-40 w-full bg-muted">
                                        <Image
                                          src={midia.url}
                                          alt={midia.nome}
                                          fill
                                          sizes="240px"
                                          className="object-cover transition group-hover:scale-105"
                                          unoptimized
                                        />
                                      </div>
                                    ) : midiaEhVideo(midia.tipo) ? (
                                      <div className="flex h-40 w-full items-center justify-center bg-black text-white">
                                        <div className="flex flex-col items-center gap-2">
                                          <Play className="h-8 w-8" />
                                          <span className="text-xs font-semibold">
                                            Ver vídeo
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex h-40 w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                        Arquivo anexado
                                      </div>
                                    )}

                                    <div className="p-3">
                                      <p className="line-clamp-1 text-xs font-semibold">
                                        {midia.nome}
                                      </p>

                                      <p className="text-xs text-muted-foreground">
                                        {midia.tipo || "Tipo não informado"}
                                      </p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este prestador ainda não possui avaliações.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

type InfoItemProps = {
  label: string
  value: string | null | undefined
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-sm font-semibold">
        {value || "Não informado"}
      </p>
    </div>
  )
}