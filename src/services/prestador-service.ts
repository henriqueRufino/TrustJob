import { createClient } from "@/lib/supabase/client"

export type PrestadorDetalheData = {
  id: number
  nome: string | null
  email: string | null
  telefone: string | null
  data_nascimento: string | null
  cpf: string | null
  foto: string | null
  created_at: string | null
  estado: string | null
  cidade: string | null
}

export type AvaliacaoPrestadorData = {
  id: number
  nota: number | null
  titulo: string | null
  comentario: string | null
  midia: string | null
  created_at: string | null
  servico_id: number | null
  servico_nome: string | null
  servico_solicitado_id: number | null
  cliente_id: number | null
}

export type MediaServicoPrestadorData = {
  servico_id: number
  servico_nome: string
  total_avaliacoes: number
  media_avaliacoes: number
}

export type ServicoPrestadorPerfilData = {
  id: number
  servico_id: number
  user_id: number
  servico_nome: string
  valor_medio: number | null
}

type PrestadorRow = {
  id: number
  nome: string | null
  email: string | null
  telefone: string | null
  data_nascimento: string | null
  cpf: string | null
  foto: string | null
  created_at: string | null
  user_address:
    | {
        estado:
          | {
              nome: string | null
              uf: string | null
            }
          | null
        cidade:
          | {
              nome: string | null
            }
          | null
      }
    | {
        estado:
          | {
              nome: string | null
              uf: string | null
            }
          | null
        cidade:
          | {
              nome: string | null
            }
          | null
      }[]
    | null
}

type AvaliacaoRow = {
  id: number
  nota: number | null
  titulo: string | null
  comentario: string | null
  midia: string | null
  created_at: string | null
  servico_id: number | null
  servico_solicitado_id: number | null
  servico:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
  servico_solicitado:
    | {
        prestador_id: number | null
        cliente_id: number | null
      }
    | {
        prestador_id: number | null
        cliente_id: number | null
      }[]
    | null
}

type ServicoPrestadorPerfilRow = {
  id: number
  servico_id: number | null
  user_id: number | null
  valor_medio: number | null
  servico:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
}

type AvaliacaoMediaServicoRow = {
  servico_id: number | null
  nota: number | null
}

function getRelacaoUnica<T>(relacao: T | T[] | null | undefined) {
  return Array.isArray(relacao) ? relacao[0] : relacao
}

export async function getPrestadorDetalhe(
  prestadorId: number
): Promise<PrestadorDetalheData | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("user")
    .select(`
      id,
      nome,
      email,
      telefone,
      data_nascimento,
      cpf,
      foto,
      created_at,
      user_address (
        estado:estado_id (
          nome,
          uf
        ),
        cidade:cidade_id (
          nome
        )
      )
    `)
    .eq("id", prestadorId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const prestador = data as unknown as PrestadorRow

  const endereco = Array.isArray(prestador.user_address)
    ? prestador.user_address[0]
    : prestador.user_address

  const estadoNome = endereco?.estado?.nome ?? null
  const estadoUf = endereco?.estado?.uf ?? null

  return {
    id: prestador.id,
    nome: prestador.nome,
    email: prestador.email,
    telefone: prestador.telefone,
    data_nascimento: prestador.data_nascimento,
    cpf: prestador.cpf,
    foto: prestador.foto,
    created_at: prestador.created_at,
    estado:
      estadoNome && estadoUf
        ? `${estadoNome} - ${estadoUf}`
        : estadoNome ?? estadoUf ?? null,
    cidade: endereco?.cidade?.nome ?? null,
  }
}

export async function getAvaliacoesPorPrestador(
  prestadorId: number
): Promise<AvaliacaoPrestadorData[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("avaliacao")
    .select(`
      id,
      nota,
      titulo,
      comentario,
      midia,
      created_at,
      servico_id,
      servico_solicitado_id,
      servico:servico_id (
        nome
      ),
      servico_solicitado:servico_solicitado_id!inner (
        prestador_id,
        cliente_id
      )
    `)
    .eq("servico_solicitado.prestador_id", prestadorId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const avaliacoes = (data ?? []) as unknown as AvaliacaoRow[]

  return avaliacoes.map((avaliacao) => {
    const servico = getRelacaoUnica(avaliacao.servico)

    const servicoSolicitado = getRelacaoUnica(avaliacao.servico_solicitado)

    return {
      id: avaliacao.id,
      nota: avaliacao.nota,
      titulo: avaliacao.titulo,
      comentario: avaliacao.comentario,
      midia: avaliacao.midia,
      created_at: avaliacao.created_at,
      servico_id: avaliacao.servico_id,
      servico_nome: servico?.nome ?? null,
      servico_solicitado_id: avaliacao.servico_solicitado_id,
      cliente_id: servicoSolicitado?.cliente_id ?? null,
    }
  })
}

export async function getServicosDoPrestador(
  prestadorId: number
): Promise<ServicoPrestadorPerfilData[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("servico_prestador")
    .select(`
      id,
      servico_id,
      user_id,
      valor_medio,
      servico:servico_id (
        nome
      )
    `)
    .eq("user_id", prestadorId)
    .order("id", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const servicos = (data ?? []) as unknown as ServicoPrestadorPerfilRow[]

  return servicos
    .map((item) => {
      const servico = getRelacaoUnica(item.servico)

      return {
        id: item.id,
        servico_id: item.servico_id,
        user_id: item.user_id,
        valor_medio:
          item.valor_medio !== null ? Number(item.valor_medio) : null,
        servico_nome: servico?.nome ?? "Serviço sem nome",
      }
    })
    .filter(
      (item): item is ServicoPrestadorPerfilData =>
        item.servico_id !== null && item.user_id !== null
    )
}

export async function getMediasAvaliacoesServicosDoPrestador(
  prestadorId: number
): Promise<MediaServicoPrestadorData[]> {
  const supabase = createClient()

  const servicosAtivos = await getServicosDoPrestador(prestadorId)

  if (servicosAtivos.length === 0) {
    return []
  }

  const servicosIds = servicosAtivos.map((item) => item.servico_id)

  const { data: avaliacoesData, error: avaliacoesError } = await supabase
    .from("avaliacao")
    .select("servico_id, nota")
    .eq("user_id", prestadorId)
    .in("servico_id", servicosIds)

  if (avaliacoesError) {
    throw new Error(avaliacoesError.message)
  }

  const avaliacoes = (avaliacoesData ??
    []) as unknown as AvaliacaoMediaServicoRow[]

  return servicosAtivos.map((servico) => {
    const avaliacoesDoServico = avaliacoes.filter(
      (avaliacao) =>
        avaliacao.servico_id === servico.servico_id &&
        avaliacao.nota !== null
    )

    const totalAvaliacoes = avaliacoesDoServico.length

    const mediaAvaliacoes =
      totalAvaliacoes > 0
        ? avaliacoesDoServico.reduce(
            (total, avaliacao) => total + Number(avaliacao.nota ?? 0),
            0
          ) / totalAvaliacoes
        : 0

    return {
      servico_id: servico.servico_id,
      servico_nome: servico.servico_nome,
      total_avaliacoes: totalAvaliacoes,
      media_avaliacoes: mediaAvaliacoes,
    }
  })
}