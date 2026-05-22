"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpDown, ChevronDown, ChevronUp, Play } from "lucide-react"
import {
  getAvaliacoesPorPrestador,
  getPrestadorDetalhe,
  type AvaliacaoPrestadorData,
  type PrestadorDetalheData,
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
  const [prestador, setPrestador] = React.useState<PrestadorDetalheData | null>(
    null
  )

  const [avaliacoes, setAvaliacoes] = React.useState<AvaliacaoPrestadorData[]>(
    []
  )

  const [ordenacao, setOrdenacao] =
    React.useState<TipoOrdenacao>("cronologica")
  const [ordemAscendente, setOrdemAscendente] = React.useState(false)

  const [avaliacoesAbertas, setAvaliacoesAbertas] = React.useState<number[]>(
    []
  )

  const [loading, setLoading] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function carregarDados() {
      setLoading(true)
      setErro(null)

      try {
        const [prestadorData, avaliacoesData] = await Promise.all([
          getPrestadorDetalhe(prestadorId),
          getAvaliacoesPorPrestador(prestadorId),
        ])

        setPrestador(prestadorData)
        setAvaliacoes(avaliacoesData)
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar dados do prestador."
        )
      }

      setLoading(false)
    }

    carregarDados()
  }, [prestadorId])

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
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-xl font-bold">Avaliações geral do prestador</h2>

            <div className="flex text-foreground">
              {renderEstrelas(mediaAvaliacoes)}
            </div>

            <p className="text-sm font-semibold">
              Média {mediaAvaliacoes.toFixed(1).replace(".", ",")} de 5
            </p>

            <p className="text-sm text-muted-foreground">
              {totalAvaliacoes} avaliaç
              {totalAvaliacoes === 1 ? "ão" : "ões"}
            </p>
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