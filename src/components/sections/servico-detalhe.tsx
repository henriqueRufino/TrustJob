"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { PrestadorCatalogo } from "@/types/servico-prestador"
import {
  cadastrarPrestadorNoServico,
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

export default function ServicoDetalhe({ servicoId }: ServicoDetalheProps) {
  const supabase = createClient()

  const [nomeServico, setNomeServico] = React.useState("")
  const [prestadores, setPrestadores] = React.useState<PrestadorCatalogo[]>([])
  const [usuarioLogado, setUsuarioLogado] = React.useState<UsuarioLogado | null>(null)
  const [jaCadastrado, setJaCadastrado] = React.useState(false)
  const [mostrarCampoValor, setMostrarCampoValor] = React.useState(false)
  const [valorMedio, setValorMedio] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  const usuarioEhPrestador = usuarioLogado?.tipo_user_id === 2
  const podeMostrarBotaoCadastro = usuarioEhPrestador && !jaCadastrado

  const prestadoresOrdenados = React.useMemo(() => {
    if (!usuarioLogado) {
      return prestadores
    }

    return [...prestadores].sort((a, b) => {
      if (a.user_id === usuarioLogado.id) return -1
      if (b.user_id === usuarioLogado.id) return 1
      return 0
    })
  }, [prestadores, usuarioLogado])

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
        setErro(error instanceof Error ? error.message : "Erro ao buscar prestadores.")
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

  function renderEstrelas(media: number) {
    const mediaArredondada = Math.round(media)

    return Array.from({ length: 5 }).map((_, index) => (
      <span key={index} className="text-xl leading-none">
        {index < mediaArredondada ? "★" : "☆"}
      </span>
    ))
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
      <div className="flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold uppercase md:text-3xl">
            {nomeServico}
          </h1>

          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Escolha um prestador disponível para este serviço.
          </p>
        </div>

        {erro && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        <div className="flex flex-wrap gap-6">
          {podeMostrarBotaoCadastro && (
            <div className="flex h-56 w-full max-w-56 flex-col items-center justify-center gap-3 rounded-3xl border-4 border-foreground bg-background p-4 text-center">
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
                    className="w-full rounded-xl border border-foreground bg-background px-3 py-2 text-center text-sm outline-none"
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
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          )}

          {prestadores.length > 0 ? (
            prestadoresOrdenados.map((prestador) => (
              <Link
                key={prestador.id}
                href={`/prestadores/${prestador.user_id}`}
                className="flex h-56 w-full max-w-56 flex-col items-center justify-center gap-3 rounded-3xl border-4 border-foreground bg-background p-4 text-center transition hover:bg-muted"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-foreground bg-muted">
                  {prestador.foto ? (
                    <Image
                      src={prestador.foto}
                      alt={`Foto de ${prestador.nome}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold">
                      Foto
                    </div>
                  )}
                </div>

                <p className="line-clamp-1 text-sm font-bold">
                  {prestador.nome}
                </p>

                <div className="flex text-foreground">
                  {renderEstrelas(prestador.media_avaliacoes)}
                </div>

                <div className="flex flex-col gap-1 text-xs font-semibold">
                  <span>
                    {prestador.total_avaliacoes} avaliaç
                    {prestador.total_avaliacoes === 1 ? "ão" : "ões"}
                  </span>

                  <span>
                    {prestador.cidade ?? "Cidade não informada"}
                  </span>

                  <span>
                    {prestador.valor_medio !== null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(prestador.valor_medio)
                      : "Valor não informado"}
                  </span>
                </div>
              </Link>
            ))
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