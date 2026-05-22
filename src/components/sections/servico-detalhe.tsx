"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowUpDown, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { PrestadorCatalogo } from "@/types/servico-prestador"
import {
  atualizarValorMedioPrestadorNoServico,
  cadastrarPrestadorNoServico,
  excluirPrestadorDoServico,
  getPrestadoresPorServico,
  verificarPrestadorNoServico,
} from "@/services/servico-prestador-service"

type ServicoDetalheProps = {
  servicoId: number
}

type UsuarioLogado = {
  id: number
  nome: string | null
  tipo_user_id: number | null
}

type TipoOrdenacao = "avaliacao" | "cidade" | "valor"

export default function ServicoDetalhe({ servicoId }: ServicoDetalheProps) {
  const supabase = createClient()

  const [nomeServico, setNomeServico] = React.useState("")
  const [prestadores, setPrestadores] = React.useState<PrestadorCatalogo[]>([])
  const [usuarioLogado, setUsuarioLogado] =
    React.useState<UsuarioLogado | null>(null)
  const [jaCadastrado, setJaCadastrado] = React.useState(false)

  const [ordenacao, setOrdenacao] = React.useState<TipoOrdenacao>("avaliacao")
  const [ordemAscendente, setOrdemAscendente] = React.useState(false)

  const [mostrarCampoValor, setMostrarCampoValor] = React.useState(false)
  const [valorMedio, setValorMedio] = React.useState("")

  const [prestadorEditandoId, setPrestadorEditandoId] = React.useState<
    number | null
  >(null)
  const [valorMedioEditando, setValorMedioEditando] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  const usuarioEhPrestador = usuarioLogado?.tipo_user_id === 2
  const podeMostrarBotaoCadastro = usuarioEhPrestador && !jaCadastrado

  const prestadoresOrdenados = React.useMemo(() => {
    const lista = [...prestadores]

    lista.sort((a, b) => {
      const aEhUsuarioLogado = usuarioLogado?.id === a.user_id
      const bEhUsuarioLogado = usuarioLogado?.id === b.user_id

      if (aEhUsuarioLogado) return -1
      if (bEhUsuarioLogado) return 1

      if (ordenacao === "avaliacao") {
        const mediaA = Number(a.media_avaliacoes ?? 0)
        const mediaB = Number(b.media_avaliacoes ?? 0)

        return ordemAscendente ? mediaA - mediaB : mediaB - mediaA
      }

      if (ordenacao === "cidade") {
        const cidadeA = a.cidade ?? ""
        const cidadeB = b.cidade ?? ""

        return ordemAscendente
          ? cidadeA.localeCompare(cidadeB)
          : cidadeB.localeCompare(cidadeA)
      }

      const valorA = Number(a.valor_medio ?? 0)
      const valorB = Number(b.valor_medio ?? 0)

      return ordemAscendente ? valorA - valorB : valorB - valorA
    })

    return lista
  }, [prestadores, usuarioLogado, ordenacao, ordemAscendente])

  React.useEffect(() => {
    async function carregarDados() {
      setLoading(true)
      setErro(null)

      const { data: servico, error: servicoError } = await supabase
        .from("servico")
        .select("nome")
        .eq("id", servicoId)
        .maybeSingle()

      if (servicoError) {
        setErro(servicoError.message)
        setLoading(false)
        return
      }

      setNomeServico(servico?.nome ?? "Serviço")

      try {
        const prestadoresData = await getPrestadoresPorServico(servicoId)
        setPrestadores(prestadoresData)
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Erro ao buscar prestadores."
        )
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUsuarioLogado(null)
        setJaCadastrado(false)
        setLoading(false)
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("user")
        .select("id, nome, tipo_user_id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (perfilError) {
        setErro(perfilError.message)
        setLoading(false)
        return
      }

      if (!perfil) {
        setUsuarioLogado(null)
        setJaCadastrado(false)
        setLoading(false)
        return
      }

      setUsuarioLogado(perfil)

      if (perfil.tipo_user_id === 2) {
        try {
          const cadastroExistente = await verificarPrestadorNoServico(
            servicoId,
            perfil.id
          )

          setJaCadastrado(!!cadastroExistente)
        } catch (error) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao verificar cadastro do prestador."
          )
        }
      }

      setLoading(false)
    }

    carregarDados()
  }, [servicoId, supabase])

  async function handleCadastrarPrestador() {
    if (!usuarioLogado) {
      setErro("Você precisa estar logado para se cadastrar como prestador.")
      return
    }

    const valorNormalizado = valorMedio.replace(",", ".")
    const valorConvertido = Number(valorNormalizado)

    if (!valorMedio.trim()) {
      setErro("Informe o valor médio do seu serviço antes de continuar.")
      return
    }

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      setErro("Informe um valor médio válido para o serviço.")
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      await cadastrarPrestadorNoServico(
        servicoId,
        usuarioLogado.id,
        valorConvertido
      )

      const prestadoresAtualizados = await getPrestadoresPorServico(servicoId)

      setPrestadores(prestadoresAtualizados)
      setJaCadastrado(true)
      setMostrarCampoValor(false)
      setValorMedio("")
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar prestador no serviço."
      )
    }

    setSalvando(false)
  }

  function iniciarEdicaoValor(prestador: PrestadorCatalogo) {
    setErro(null)
    setPrestadorEditandoId(prestador.id)
    setValorMedioEditando(
      prestador.valor_medio !== null
        ? String(prestador.valor_medio).replace(".", ",")
        : ""
    )
  }

  function cancelarEdicaoValor() {
    setPrestadorEditandoId(null)
    setValorMedioEditando("")
    setErro(null)
  }

  async function handleAtualizarValorMedio() {
    if (!usuarioLogado) {
      setErro("Você precisa estar logado para editar o valor do serviço.")
      return
    }

    const valorNormalizado = valorMedioEditando.replace(",", ".")
    const valorConvertido = Number(valorNormalizado)

    if (!valorMedioEditando.trim()) {
      setErro("Informe o novo valor médio do serviço.")
      return
    }

    if (Number.isNaN(valorConvertido) || valorConvertido <= 0) {
      setErro("Informe um valor médio válido para o serviço.")
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      await atualizarValorMedioPrestadorNoServico(
        servicoId,
        usuarioLogado.id,
        valorConvertido
      )

      const prestadoresAtualizados = await getPrestadoresPorServico(servicoId)

      setPrestadores(prestadoresAtualizados)
      setPrestadorEditandoId(null)
      setValorMedioEditando("")
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar valor médio do serviço."
      )
    }

    setSalvando(false)
  }

  async function handleExcluirPrestadorDoServico() {
    if (!usuarioLogado) {
      setErro("Você precisa estar logado para excluir este serviço.")
      return
    }

    const confirmarExclusao = window.confirm(
      "Tem certeza que deseja remover este serviço do seu catálogo?"
    )

    if (!confirmarExclusao) {
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      await excluirPrestadorDoServico(servicoId, usuarioLogado.id)

      const prestadoresAtualizados = await getPrestadoresPorServico(servicoId)

      setPrestadores(prestadoresAtualizados)
      setJaCadastrado(false)
      setPrestadorEditandoId(null)
      setValorMedioEditando("")
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao excluir serviço do prestador."
      )
    }

    setSalvando(false)
  }

  function renderEstrelas(media: number) {
    const mediaArredondada = Math.round(media)

    return Array.from({ length: 5 }).map((_, index) => (
      <span key={index} className="text-xl leading-none">
        {index < mediaArredondada ? "★" : "☆"}
      </span>
    ))
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

  function formatarMedia(media: number | null | undefined) {
    return Number(media ?? 0).toFixed(1).replace(".", ",")
  }

  function getTextoOrdenacao() {
    if (ordenacao === "avaliacao") {
      return ordemAscendente
        ? "menor avaliação primeiro"
        : "maior avaliação primeiro"
    }

    if (ordenacao === "cidade") {
      return ordemAscendente ? "cidade A-Z" : "cidade Z-A"
    }

    return ordemAscendente ? "menor valor primeiro" : "maior valor primeiro"
  }

  function renderFotoPrestador(
    prestador: PrestadorCatalogo,
    prestadorEhUsuarioLogado: boolean
  ) {
    const foto = (
      <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-2 border-gray-400 bg-muted">
        {prestador.foto ? (
          <Image
            src={prestador.foto}
            alt={`Foto de ${prestador.nome}`}
            fill
            sizes="112px"
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

    if (!prestadorEhUsuarioLogado) {
      return foto
    }

    return (
      <Link
        href={`/prestadores/${prestador.user_id}?servicoId=${servicoId}`}
        className="transition hover:opacity-80"
        title="Ver meu perfil de prestador"
      >
        {foto}
      </Link>
    )
  }

  if (loading) {
    return (
      <section className="flex justify-center px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Carregando serviço...</p>
      </section>
    )
  }

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold uppercase md:text-3xl">
            {nomeServico}
          </h1>

          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Escolha um prestador disponível para este serviço.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-300 bg-background p-4 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Prestadores disponíveis</h2>

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
                className="h-11 rounded-xl border border-gray-300 bg-background px-3 text-sm"
              >
                <option value="avaliacao">Avaliação geral</option>
                <option value="cidade">Cidade</option>
                <option value="valor">Valor médio</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => setOrdemAscendente((valorAtual) => !valorAtual)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold transition hover:bg-muted sm:self-end"
            >
              <ArrowUpDown className="h-4 w-4" />
              Inverter
            </button>
          </div>
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {podeMostrarBotaoCadastro && (
            <div className="flex min-h-80 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-gray-300 bg-background p-4 text-center transition hover:bg-muted">
              {!mostrarCampoValor ? (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCampoValor(true)
                    setErro(null)
                  }}
                  className="flex flex-col items-center justify-center gap-3"
                >
                  <Plus className="h-16 w-16" />

                  <span className="text-sm font-bold">
                    Adicionar meu serviço
                  </span>
                </button>
              ) : (
                <>
                  <label
                    htmlFor="valorMedio"
                    className="text-xs font-bold uppercase"
                  >
                    Valor médio
                  </label>

                  <input
                    id="valorMedio"
                    type="text"
                    inputMode="decimal"
                    value={valorMedio}
                    onChange={(event) => setValorMedio(event.target.value)}
                    placeholder="Ex: 120,00"
                    className="w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-center text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleCadastrarPrestador}
                    disabled={salvando}
                    className="w-full rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background transition hover:opacity-90 disabled:opacity-60"
                  >
                    {salvando ? "Salvando..." : "Confirmar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCampoValor(false)
                      setValorMedio("")
                      setErro(null)
                    }}
                    disabled={salvando}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          )}

          {prestadoresOrdenados.length > 0 ? (
            prestadoresOrdenados.map((prestador) => {
              const prestadorEhUsuarioLogado =
                usuarioLogado?.id === prestador.user_id

              const estaEditando = prestadorEditandoId === prestador.id

              const media = Number(prestador.media_avaliacoes ?? 0)
              const totalAvaliacoes = Number(prestador.total_avaliacoes ?? 0)

              const conteudoCard = (
                <div className="flex min-h-80 w-full flex-col items-center justify-start gap-3 rounded-3xl border-2 border-gray-300 bg-background p-4 text-center transition hover:bg-muted">
                  {renderFotoPrestador(prestador, prestadorEhUsuarioLogado)}

                  <p className="line-clamp-2 min-h-10 text-sm font-bold leading-normal">
                    {prestador.nome}
                  </p>

                  <div className="flex text-foreground">
                    {renderEstrelas(media)}
                  </div>

                  <div className="flex w-full flex-col items-center gap-1 text-xs font-semibold">
                    <span>Média {formatarMedia(media)} de 5</span>

                    <span>
                      {totalAvaliacoes} avaliaç
                      {totalAvaliacoes === 1 ? "ão" : "ões"}
                    </span>

                    <span>{prestador.cidade ?? "Cidade não informada"}</span>

                    {!estaEditando ? (
                      prestadorEhUsuarioLogado ? (
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoValor(prestador)}
                          className="font-bold text-foreground underline-offset-4 hover:underline"
                        >
                          {prestador.valor_medio !== null
                            ? formatarValor(prestador.valor_medio)
                            : "Informar valor"}
                        </button>
                      ) : (
                        <span>{formatarValor(prestador.valor_medio)}</span>
                      )
                    ) : (
                      <div className="mt-1 flex w-full flex-col gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valorMedioEditando}
                          onChange={(event) =>
                            setValorMedioEditando(event.target.value)
                          }
                          placeholder="Ex: 200,00"
                          className="w-full rounded-xl border border-gray-300 bg-background px-2 py-1 text-center text-xs outline-none"
                        />

                        <button
                          type="button"
                          onClick={handleAtualizarValorMedio}
                          disabled={salvando}
                          className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background transition hover:opacity-90 disabled:opacity-60"
                        >
                          {salvando ? "Salvando..." : "Salvar valor"}
                        </button>

                        <button
                          type="button"
                          onClick={handleExcluirPrestadorDoServico}
                          disabled={salvando}
                          className="rounded-xl border border-red-300 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Excluir serviço
                        </button>

                        <button
                          type="button"
                          onClick={cancelarEdicaoValor}
                          disabled={salvando}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )

              if (prestadorEhUsuarioLogado) {
                return <div key={prestador.id}>{conteudoCard}</div>
              }

              return (
                <Link
                  key={prestador.id}
                  href={`/prestadores/${prestador.user_id}?servicoId=${servicoId}`}
                  className="block"
                >
                  {conteudoCard}
                </Link>
              )
            })
          ) : (
            !podeMostrarBotaoCadastro && (
              <p className="text-sm text-muted-foreground">
                Nenhum prestador cadastrado para este serviço.
              </p>
            )
          )}
        </div>
      </div>
    </section>
  )
}