import { createClient } from "@/lib/supabase/client"
import type { PrestadorCatalogo } from "@/types/servico-prestador"

type ServicoPrestadorRow = {
  id: number
  user_id: number
  servico_id: number
  valor_medio: number | null
  user:
    | {
        id: number
        nome: string | null
        foto: string | null
        tipo_user_id: number | null
        user_address:
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | null
            }
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | null
            }[]
          | null
      }
    | {
        id: number
        nome: string | null
        foto: string | null
        tipo_user_id: number | null
        user_address:
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | null
            }
          | {
              cidade:
                | {
                    nome: string | null
                  }
                | null
            }[]
          | null
      }[]
    | null
}

type AvaliacaoRow = {
  user_id: number
  servico_id: number
  nota: number | null
}

export async function getPrestadoresPorServico(
  servicoId: number
): Promise<PrestadorCatalogo[]> {
  const supabase = createClient()

  const { data: prestadores, error: prestadoresError } = await supabase
    .from("servico_prestador")
    .select(`
      id,
      user_id,
      servico_id,
      valor_medio,
      user:user_id (
        id,
        nome,
        foto,
        tipo_user_id,
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

  const { data: avaliacoes, error: avaliacoesError } = await supabase
    .from("avaliacao")
    .select("user_id, servico_id, nota")
    .eq("servico_id", servicoId)

  if (avaliacoesError) {
    throw new Error(avaliacoesError.message)
  }

  const prestadoresTyped = (prestadores ?? []) as unknown as ServicoPrestadorRow[]
  const avaliacoesTyped = (avaliacoes ?? []) as AvaliacaoRow[]

  return prestadoresTyped
    .map((prestador) => {
      const usuario = Array.isArray(prestador.user)
        ? prestador.user[0]
        : prestador.user

      const endereco = Array.isArray(usuario?.user_address)
        ? usuario.user_address[0]
        : usuario?.user_address

      const nomeCidade = endereco?.cidade?.nome ?? null

      const avaliacoesDoPrestador = avaliacoesTyped.filter(
        (avaliacao) =>
          avaliacao.user_id === prestador.user_id &&
          avaliacao.servico_id === prestador.servico_id &&
          avaliacao.nota !== null
      )

      const totalAvaliacoes = avaliacoesDoPrestador.length

      const mediaAvaliacoes =
        totalAvaliacoes > 0
          ? avaliacoesDoPrestador.reduce(
              (total, avaliacao) => total + Number(avaliacao.nota),
              0
            ) / totalAvaliacoes
          : 0

      return {
        id: prestador.id,
        user_id: prestador.user_id,
        servico_id: prestador.servico_id,
        nome: usuario?.nome ?? "Prestador sem nome",
        foto: usuario?.foto ?? null,
        cidade: nomeCidade,
        valor_medio:
          prestador.valor_medio !== null ? Number(prestador.valor_medio) : null,
        media_avaliacoes: mediaAvaliacoes,
        total_avaliacoes: totalAvaliacoes,
      }
    })
    .filter((prestador) => prestador.nome !== "Prestador sem nome")
}

export async function verificarPrestadorNoServico(
  servicoId: number,
  userId: number
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("servico_prestador")
    .select("id")
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

    const jaExiste = await verificarPrestadorNoServico(servicoId, userId)

    if (jaExiste) {
      return jaExiste
    }

    const { data, error } = await supabase
      .from("servico_prestador")
      .insert({
        servico_id: servicoId,
        user_id: userId,
        valor_medio: valorMedio,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  export async function atualizarValorMedioPrestadorNoServico(
    servicoId: number,
    userId: number,
    valorMedio: number
  ) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("servico_prestador")
      .update({
        valor_medio: valorMedio,
      })
      .eq("servico_id", servicoId)
      .eq("user_id", userId)
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
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