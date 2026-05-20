import { createClient } from "@/lib/supabase/client"
import { enviarMensagemChat } from "@/services/chat-service"

export type PapelAgendamento = "cliente" | "prestador"

export type AgendamentoItem = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  servico_etapa_id: number | null
  inicio: string | null
  fim: string | null
  valor_final: number | null
  created_at: string
  updated_at: string | null
  observacoes: string | null
  data_agendada: string | null
  papel_usuario_logado: PapelAgendamento
  servico_nome: string | null
  etapa_nome: string | null
  cliente_nome: string | null
  cliente_foto: string | null
  prestador_nome: string | null
  prestador_foto: string | null
  endereco_cliente: string | null
}

export type AgendamentosUsuarioData = {
  usuario_id: number
  agendamentos: AgendamentoItem[]
}

type UserAddressRow = {
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cep: string | null
  cidade:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
  estado:
    | {
        nome: string | null
        uf: string | null
      }
    | {
        nome: string | null
        uf: string | null
      }[]
    | null
}

type UsuarioRelRow = {
  nome: string | null
  foto: string | null
  user_address: UserAddressRow | UserAddressRow[] | null
}

type AgendamentoRow = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  servico_etapa_id: number | null
  inicio: string | null
  fim: string | null
  valor_final: number | null
  created_at: string
  updated_at: string | null
  observacoes: string | null
  data_agendada: string | null
  servico:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
  servico_etapa:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
  cliente: UsuarioRelRow | UsuarioRelRow[] | null
  prestador: UsuarioRelRow | UsuarioRelRow[] | null
}

function getRelacaoUnica<T>(relacao: T | T[] | null | undefined) {
  return Array.isArray(relacao) ? relacao[0] : relacao
}

function montarEnderecoCliente(cliente: UsuarioRelRow | null | undefined) {
  const endereco = getRelacaoUnica(cliente?.user_address)

  if (!endereco) {
    return null
  }

  const cidade = getRelacaoUnica(endereco.cidade)
  const estado = getRelacaoUnica(endereco.estado)

  const partes = [
    endereco.logradouro,
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    cidade?.nome,
    estado?.uf,
    endereco.cep ? `CEP ${endereco.cep}` : null,
  ].filter(Boolean)

  return partes.length > 0 ? partes.join(", ") : null
}

export async function getUsuarioLogadoId(): Promise<number | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("user")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.id ?? null
}

export async function getAgendamentosDoUsuarioLogado(): Promise<AgendamentosUsuarioData> {
  const supabase = createClient()

  const usuarioId = await getUsuarioLogadoId()

  if (!usuarioId) {
    return {
      usuario_id: 0,
      agendamentos: [],
    }
  }

  const { data, error } = await supabase
    .from("servico_solicitado")
    .select(`
      id,
      cliente_id,
      prestador_id,
      servico_id,
      servico_etapa_id,
      inicio,
      fim,
      valor_final,
      created_at,
      updated_at,
      observacoes,
      data_agendada,
      servico:servico_id (
        nome
      ),
      servico_etapa:servico_etapa_id (
        nome
      ),
      cliente:cliente_id (
        nome,
        foto,
        user_address (
          logradouro,
          numero,
          complemento,
          bairro,
          cep,
          cidade:cidade_id (
            nome
          ),
          estado:estado_id (
            nome,
            uf
          )
        )
      ),
      prestador:prestador_id (
        nome,
        foto
      )
    `)
    .or(`cliente_id.eq.${usuarioId},prestador_id.eq.${usuarioId}`)
    .gte("servico_etapa_id", 2)
    .order("data_agendada", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as unknown as AgendamentoRow[]

  const agendamentos = rows.map((row) => {
    const servico = getRelacaoUnica(row.servico)
    const etapa = getRelacaoUnica(row.servico_etapa)
    const cliente = getRelacaoUnica(row.cliente)
    const prestador = getRelacaoUnica(row.prestador)

    return {
      id: row.id,
      cliente_id: row.cliente_id,
      prestador_id: row.prestador_id,
      servico_id: row.servico_id,
      servico_etapa_id: row.servico_etapa_id,
      inicio: row.inicio,
      fim: row.fim,
      valor_final: row.valor_final !== null ? Number(row.valor_final) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      observacoes: row.observacoes,
      data_agendada: row.data_agendada,
      papel_usuario_logado:
        row.prestador_id === usuarioId ? "prestador" : "cliente",
      servico_nome: servico?.nome ?? null,
      etapa_nome: etapa?.nome ?? null,
      cliente_nome: cliente?.nome ?? null,
      cliente_foto: cliente?.foto ?? null,
      prestador_nome: prestador?.nome ?? null,
      prestador_foto: prestador?.foto ?? null,
      endereco_cliente: montarEnderecoCliente(cliente),
    } satisfies AgendamentoItem
  })

  return {
    usuario_id: usuarioId,
    agendamentos,
  }
}

async function getConversaPorServicoSolicitado(servicoSolicitadoId: number) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chat_conversa")
    .select("id")
    .eq("servico_solicitado_id", servicoSolicitadoId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function solicitarCheckinAgendamento(
  servicoSolicitadoId: number,
  prestadorId: number
) {
  const supabase = createClient()

  const { data: agendamento, error: buscaError } = await supabase
    .from("servico_solicitado")
    .select("id, prestador_id, servico_etapa_id")
    .eq("id", servicoSolicitadoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.")
  }

  if (agendamento.prestador_id !== prestadorId) {
    throw new Error("Apenas o prestador pode solicitar check-in.")
  }

  if (agendamento.servico_etapa_id !== 2) {
    throw new Error("O check-in só pode ser solicitado em serviços confirmados.")
  }

  await supabase
    .from("servico_solicitado")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", servicoSolicitadoId)

  const conversa = await getConversaPorServicoSolicitado(servicoSolicitadoId)

  if (conversa) {
    await enviarMensagemChat(
      conversa.id,
      prestadorId,
      "O prestador solicitou o check-in do serviço. Acesse a aba agendamentos para confirmar."
    )
  }
}

export async function confirmarCheckinAgendamento(
  servicoSolicitadoId: number,
  clienteId: number
) {
  const supabase = createClient()

  const { data: agendamento, error: buscaError } = await supabase
    .from("servico_solicitado")
    .select("id, cliente_id, servico_etapa_id")
    .eq("id", servicoSolicitadoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.")
  }

  if (agendamento.cliente_id !== clienteId) {
    throw new Error("Apenas o cliente pode confirmar o check-in.")
  }

  if (agendamento.servico_etapa_id !== 2) {
    throw new Error("O check-in só pode ser confirmado em serviços confirmados.")
  }

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      servico_etapa_id: 3,
    })
    .eq("id", servicoSolicitadoId)

  if (error) {
    throw new Error(error.message)
  }

  const conversa = await getConversaPorServicoSolicitado(servicoSolicitadoId)

  if (conversa) {
    await enviarMensagemChat(
      conversa.id,
      clienteId,
      "Check-in confirmado pelo cliente. O serviço está em execução."
    )
  }
}