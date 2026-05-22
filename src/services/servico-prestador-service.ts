import { createClient } from "@/lib/supabase/client"
import type { PrestadorCatalogo } from "@/types/servico-prestador"

type ServicoPrestadorRow = {
  id: number
  servico_id: number | null
  user_id: number | null
  valor_medio: number | null
  user:
    | {
        id: number
        nome: string | null
        foto: string | null
        user_address:
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | {
                    nome: string | null
                  }[]
                | null
            }
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | {
                    nome: string | null
                  }[]
                | null
            }[]
          | null
      }
    | {
        id: number
        nome: string | null
        foto: string | null
        user_address:
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | {
                    nome: string | null
                  }[]
                | null
            }
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | {
                    nome: string | null
                  }[]
                | null
            }[]
          | null
      }[]
    | null
}

type AvaliacaoPrestadorRow = {
  user_id: number | null
  nota: number | null
}

function getRelacaoUnica<T>(relacao: T | T[] | null | undefined) {
  return Array.isArray(relacao) ? relacao[0] : relacao
}

export async function getPrestadoresPorServico(
  servicoId: number
): Promise<PrestadorCatalogo[]> {
  const supabase = createClient()

  const { data: prestadoresData, error: prestadoresError } = await supabase
    .from("servico_prestador")
    .select(`
      id,
      servico_id,
      user_id,
      valor_medio,
      user:user_id (
        id,
        nome,
        foto,
        user_address (
          cidade:cidade_id (
            nome
          )
        )
      )
    `)
    .eq("servico_id", servicoId)

  if (prestadoresError) {
    throw new Error(prestadoresError.message)
  }

  const prestadores = (prestadoresData ?? []) as unknown as ServicoPrestadorRow[]

  const prestadoresIds = prestadores
    .map((prestador) => prestador.user_id)
    .filter((id): id is number => id !== null)

  let avaliacoes: AvaliacaoPrestadorRow[] = []

  if (prestadoresIds.length > 0) {
    const { data: avaliacoesData, error: avaliacoesError } = await supabase
      .from("avaliacao")
      .select("user_id, nota")
      .in("user_id", prestadoresIds)

    if (avaliacoesError) {
      throw new Error(avaliacoesError.message)
    }

    avaliacoes = (avaliacoesData ?? []) as unknown as AvaliacaoPrestadorRow[]
  }

  return prestadores.map((prestador) => {
    const usuario = getRelacaoUnica(prestador.user)
    const endereco = getRelacaoUnica(usuario?.user_address)
    const cidade = getRelacaoUnica(endereco?.cidade)

    const avaliacoesDoPrestador = avaliacoes.filter(
      (avaliacao) =>
        avaliacao.user_id === prestador.user_id && avaliacao.nota !== null
    )

    const totalAvaliacoes = avaliacoesDoPrestador.length

    const mediaAvaliacoes =
      totalAvaliacoes > 0
        ? avaliacoesDoPrestador.reduce(
            (total, avaliacao) => total + Number(avaliacao.nota ?? 0),
            0
          ) / totalAvaliacoes
        : 0

    return {
      id: prestador.id,
      servico_id: prestador.servico_id ?? servicoId,
      user_id: prestador.user_id ?? 0,
      valor_medio:
        prestador.valor_medio !== null ? Number(prestador.valor_medio) : null,
      nome: usuario?.nome ?? "Prestador sem nome",
      foto: usuario?.foto ?? null,
      cidade: cidade?.nome ?? null,
      media_avaliacoes: mediaAvaliacoes,
      total_avaliacoes: totalAvaliacoes,
    }
  })
}

export async function verificarPrestadorNoServico(
  servicoId: number,
  userId: number
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("servico_prestador")
    .select("id, servico_id, user_id, valor_medio")
    .eq("servico_id", servicoId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function cadastrarPrestadorNoServico(
  servicoId: number,
  userId: number,
  valorMedio: number
) {
  const supabase = createClient()

  const cadastroExistente = await verificarPrestadorNoServico(servicoId, userId)

  if (cadastroExistente) {
    throw new Error("Você já está cadastrado neste serviço.")
  }

  const { error } = await supabase.from("servico_prestador").insert({
    servico_id: servicoId,
    user_id: userId,
    valor_medio: valorMedio,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function atualizarValorMedioPrestadorNoServico(
  servicoId: number,
  userId: number,
  valorMedio: number
) {
  const supabase = createClient()

  const { error } = await supabase
    .from("servico_prestador")
    .update({
      valor_medio: valorMedio,
    })
    .eq("servico_id", servicoId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function excluirPrestadorDoServico(
  servicoId: number,
  userId: number
) {
  const supabase = createClient()

  const { error } = await supabase
    .from("servico_prestador")
    .delete()
    .eq("servico_id", servicoId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}