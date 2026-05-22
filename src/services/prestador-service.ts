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
    const servico = Array.isArray(avaliacao.servico)
      ? avaliacao.servico[0]
      : avaliacao.servico

    const servicoSolicitado = Array.isArray(avaliacao.servico_solicitado)
      ? avaliacao.servico_solicitado[0]
      : avaliacao.servico_solicitado

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