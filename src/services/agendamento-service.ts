import { createClient } from "@/lib/supabase/client"
import { enviarMensagemChat } from "@/services/chat-service"

export type PapelAgendamento = "cliente" | "prestador"

export type AcrescimoAgendamento = {
  id: number
  created_at: string
  prestador_id: number | null
  cliente_id: number | null
  servico_solicitado_id: number | null
  titulo: string | null
  descricao: string | null
  valor: number | null
  status: string | null
}

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
  acrescimos: AcrescimoAgendamento[]
}

export type AgendamentosUsuarioData = {
  usuario_id: number
  agendamentos: AgendamentoItem[]
}

type MidiaAvaliacao = {
  url: string
  tipo: string
  nome: string
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

type AcrescimoRow = {
  id: number
  created_at: string
  prestador_id: number | null
  cliente_id: number | null
  servico_solicitado_id: number | null
  titulo: string | null
  descricao: string | null
  valor: number | null
  status: string | null
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
  servico_acrescimo: AcrescimoRow[] | null
}

type ConversaPorServicoSolicitadoRow = {
  id: number
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

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .toLowerCase()
}

async function uploadMidiasAvaliacao(
  servicoSolicitadoId: number,
  arquivos: File[]
): Promise<MidiaAvaliacao[]> {
  const supabase = createClient()

  const midiasEnviadas: MidiaAvaliacao[] = []

  for (const arquivo of arquivos) {
    const nomeLimpo = limparNomeArquivo(arquivo.name)
    const caminhoArquivo = `servicos-solicitados/${servicoSolicitadoId}/avaliacao/${crypto.randomUUID()}-${nomeLimpo}`

    const { error: uploadError } = await supabase.storage
      .from("avaliacoes")
      .upload(caminhoArquivo, arquivo, {
        upsert: true,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: publicUrlData } = supabase.storage
      .from("avaliacoes")
      .getPublicUrl(caminhoArquivo)

    midiasEnviadas.push({
      url: publicUrlData.publicUrl,
      tipo: arquivo.type,
      nome: arquivo.name,
    })
  }

  return midiasEnviadas
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
      ),
      servico_acrescimo (
        id,
        created_at,
        prestador_id,
        cliente_id,
        servico_solicitado_id,
        titulo,
        descricao,
        valor,
        status
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

    const acrescimosOrdenados = [...(row.servico_acrescimo ?? [])].sort(
      (a, b) => {
        const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dataB = b.created_at ? new Date(b.created_at).getTime() : 0

        return dataA - dataB
      }
    )

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
      acrescimos: acrescimosOrdenados.map((acrescimo) => ({
        id: acrescimo.id,
        created_at: acrescimo.created_at,
        prestador_id: acrescimo.prestador_id,
        cliente_id: acrescimo.cliente_id,
        servico_solicitado_id: acrescimo.servico_solicitado_id,
        titulo: acrescimo.titulo,
        descricao: acrescimo.descricao,
        valor: acrescimo.valor !== null ? Number(acrescimo.valor) : null,
        status: acrescimo.status,
      })),
    } satisfies AgendamentoItem
  })

  return {
    usuario_id: usuarioId,
    agendamentos,
  }
}

async function getConversaPorServicoSolicitado(
  servicoSolicitadoId: number
): Promise<ConversaPorServicoSolicitadoRow | null> {
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

async function atualizarUpdatedAtServicoSolicitado(servicoSolicitadoId: number) {
  const supabase = createClient()

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", servicoSolicitadoId)

  if (error) {
    throw new Error(error.message)
  }
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

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      servico_etapa_id: 3,
      updated_at: new Date().toISOString(),
    })
    .eq("id", servicoSolicitadoId)

  if (error) {
    throw new Error(error.message)
  }

  const conversa = await getConversaPorServicoSolicitado(servicoSolicitadoId)

  if (conversa) {
    await enviarMensagemChat(
      conversa.id,
      prestadorId,
      "O prestador realizou o check-in. Acesse a aba agendamentos para confirmar o início do serviço."
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

  if (agendamento.servico_etapa_id !== 3) {
    throw new Error("O check-in só pode ser confirmado quando estiver em aberto.")
  }

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      servico_etapa_id: 4,
      inicio: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

type SolicitarCheckoutParams = {
  servicoSolicitadoId: number
  prestadorId: number
  fotos: File[]
}

export async function solicitarCheckoutAgendamento({
  servicoSolicitadoId,
  prestadorId,
  fotos,
}: SolicitarCheckoutParams) {
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
    throw new Error("Apenas o prestador pode solicitar checkout.")
  }

  if (agendamento.servico_etapa_id !== 4) {
    throw new Error(
      "O checkout só pode ser solicitado quando o serviço estiver em execução."
    )
  }

  if (fotos.length === 0) {
    throw new Error("Anexe pelo menos uma foto do serviço.")
  }

  for (const foto of fotos) {
    const nomeArquivo = `${Date.now()}-${limparNomeArquivo(foto.name)}`
    const caminhoArquivo = `servicos-solicitados/${servicoSolicitadoId}/checkout/${nomeArquivo}`

    const { error: uploadError } = await supabase.storage
      .from("pictures")
      .upload(caminhoArquivo, foto, {
        upsert: true,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }
  }

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      servico_etapa_id: 5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", servicoSolicitadoId)

  if (error) {
    throw new Error(error.message)
  }

  const conversa = await getConversaPorServicoSolicitado(servicoSolicitadoId)

  if (conversa) {
    await enviarMensagemChat(
      conversa.id,
      prestadorId,
      "O prestador solicitou o checkout do serviço. Acesse a aba agendamentos para confirmar."
    )
  }
}

export async function confirmarCheckoutAgendamento(
  servicoSolicitadoId: number,
  clienteId: number,
  nota: number,
  titulo: string,
  comentario: string,
  midias: File[]
) {
  const supabase = createClient()

  if (nota < 1 || nota > 5) {
    throw new Error("Informe uma avaliação entre 1 e 5 estrelas.")
  }

  if (!titulo.trim()) {
    throw new Error("Informe um título para a avaliação.")
  }

  const { data: agendamento, error: buscaError } = await supabase
    .from("servico_solicitado")
    .select("id, cliente_id, prestador_id, servico_id, servico_etapa_id")
    .eq("id", servicoSolicitadoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.")
  }

  if (agendamento.cliente_id !== clienteId) {
    throw new Error("Apenas o cliente pode confirmar o checkout.")
  }

  if (agendamento.servico_etapa_id !== 5) {
    throw new Error(
      "O checkout só pode ser confirmado quando o serviço estiver concluído."
    )
  }

  const midiasEnviadas = await uploadMidiasAvaliacao(
    servicoSolicitadoId,
    midias
  )

  const midiaJson =
    midiasEnviadas.length > 0 ? JSON.stringify(midiasEnviadas) : null

  const { data: avaliacaoExistente, error: avaliacaoBuscaError } =
    await supabase
      .from("avaliacao")
      .select("id")
      .eq("servico_solicitado_id", servicoSolicitadoId)
      .eq("user_id", agendamento.prestador_id)
      .maybeSingle()

  if (avaliacaoBuscaError) {
    throw new Error(avaliacaoBuscaError.message)
  }

  if (avaliacaoExistente) {
    const { error: avaliacaoUpdateError } = await supabase
      .from("avaliacao")
      .update({
        nota,
        titulo,
        comentario,
        midia: midiaJson,
        servico_id: agendamento.servico_id,
      })
      .eq("id", avaliacaoExistente.id)

    if (avaliacaoUpdateError) {
      throw new Error(avaliacaoUpdateError.message)
    }
  } else {
    const { error: avaliacaoInsertError } = await supabase
      .from("avaliacao")
      .insert({
        nota,
        titulo,
        comentario,
        midia: midiaJson,
        servico_id: agendamento.servico_id,
        user_id: agendamento.prestador_id,
        servico_solicitado_id: servicoSolicitadoId,
      })

    if (avaliacaoInsertError) {
      throw new Error(avaliacaoInsertError.message)
    }
  }

  const { error } = await supabase
    .from("servico_solicitado")
    .update({
      servico_etapa_id: 9,
      fim: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      "Checkout confirmado pelo cliente. Serviço finalizado com sucesso."
    )
  }
}

type CriarOuAtualizarAcrescimoParams = {
  acrescimoId?: number | null
  servicoSolicitadoId: number
  prestadorId: number
  titulo: string
  descricao: string
  valor: number
}

export async function criarOuAtualizarAcrescimoAgendamento({
  acrescimoId,
  servicoSolicitadoId,
  prestadorId,
  titulo,
  descricao,
  valor,
}: CriarOuAtualizarAcrescimoParams) {
  const supabase = createClient()

  const { data: agendamento, error: buscaError } = await supabase
    .from("servico_solicitado")
    .select("id, prestador_id, cliente_id, servico_etapa_id, valor_final")
    .eq("id", servicoSolicitadoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.")
  }

  if (agendamento.prestador_id !== prestadorId) {
    throw new Error("Apenas o prestador pode criar acréscimos.")
  }

  if (
    agendamento.servico_etapa_id === null ||
    agendamento.servico_etapa_id < 2 ||
    agendamento.servico_etapa_id > 5
  ) {
    throw new Error("Acréscimos só podem ser criados entre as etapas 2 e 5.")
  }

  if (acrescimoId) {
    const { data: acrescimoAtual, error: buscaAcrescimoError } = await supabase
      .from("servico_acrescimo")
      .select("id, status, valor")
      .eq("id", acrescimoId)
      .maybeSingle()

    if (buscaAcrescimoError) {
      throw new Error(buscaAcrescimoError.message)
    }

    if (!acrescimoAtual) {
      throw new Error("Acréscimo não encontrado.")
    }

    if (acrescimoAtual.status === "aceito") {
      throw new Error("Acréscimos aceitos não podem ser editados.")
    }

    const { error: updateError } = await supabase
      .from("servico_acrescimo")
      .update({
        titulo,
        descricao,
        valor,
        status: "pendente",
      })
      .eq("id", acrescimoId)

    if (updateError) {
      throw new Error(updateError.message)
    }
  } else {
    const { error: insertError } = await supabase
      .from("servico_acrescimo")
      .insert({
        prestador_id: agendamento.prestador_id,
        cliente_id: agendamento.cliente_id,
        servico_solicitado_id: servicoSolicitadoId,
        titulo,
        descricao,
        valor,
        status: "pendente",
      })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  await atualizarUpdatedAtServicoSolicitado(servicoSolicitadoId)

  const conversa = await getConversaPorServicoSolicitado(servicoSolicitadoId)

  if (conversa) {
    await enviarMensagemChat(
      conversa.id,
      prestadorId,
      acrescimoId
        ? `Acréscimo atualizado pelo prestador: ${titulo}. Acesse a aba agendamentos para analisar.`
        : `Novo acréscimo solicitado pelo prestador: ${titulo}. Acesse a aba agendamentos para analisar.`
    )
  }
}

export async function aceitarAcrescimoAgendamento(
  acrescimoId: number,
  clienteId: number
) {
  const supabase = createClient()

  const { data: acrescimo, error: buscaError } = await supabase
    .from("servico_acrescimo")
    .select(
      "id, cliente_id, prestador_id, servico_solicitado_id, titulo, valor, status"
    )
    .eq("id", acrescimoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!acrescimo) {
    throw new Error("Acréscimo não encontrado.")
  }

  if (acrescimo.cliente_id !== clienteId) {
    throw new Error("Apenas o cliente pode aceitar este acréscimo.")
  }

  if (acrescimo.status !== "pendente") {
    throw new Error("Apenas acréscimos pendentes podem ser aceitos.")
  }

  const { error } = await supabase
    .from("servico_acrescimo")
    .update({
      status: "aceito",
    })
    .eq("id", acrescimoId)

  if (error) {
    throw new Error(error.message)
  }

  if (acrescimo.servico_solicitado_id) {
    const { data: agendamento, error: agendamentoError } = await supabase
      .from("servico_solicitado")
      .select("valor_final")
      .eq("id", acrescimo.servico_solicitado_id)
      .maybeSingle()

    if (agendamentoError) {
      throw new Error(agendamentoError.message)
    }

    const valorAtual = Number(agendamento?.valor_final ?? 0)
    const valorAcrescimo = Number(acrescimo.valor ?? 0)

    const { error: valorUpdateError } = await supabase
      .from("servico_solicitado")
      .update({
        valor_final: valorAtual + valorAcrescimo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", acrescimo.servico_solicitado_id)

    if (valorUpdateError) {
      throw new Error(valorUpdateError.message)
    }

    await atualizarUpdatedAtServicoSolicitado(acrescimo.servico_solicitado_id)

    const conversa = await getConversaPorServicoSolicitado(
      acrescimo.servico_solicitado_id
    )

    if (conversa) {
      await enviarMensagemChat(
        conversa.id,
        clienteId,
        `Acréscimo aceito pelo cliente: ${acrescimo.titulo ?? "Acréscimo"}.`
      )
    }
  }
}

export async function recusarAcrescimoAgendamento(
  acrescimoId: number,
  clienteId: number
) {
  const supabase = createClient()

  const { data: acrescimo, error: buscaError } = await supabase
    .from("servico_acrescimo")
    .select("id, cliente_id, prestador_id, servico_solicitado_id, titulo, status")
    .eq("id", acrescimoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!acrescimo) {
    throw new Error("Acréscimo não encontrado.")
  }

  if (acrescimo.cliente_id !== clienteId) {
    throw new Error("Apenas o cliente pode recusar este acréscimo.")
  }

  if (acrescimo.status !== "pendente") {
    throw new Error("Apenas acréscimos pendentes podem ser recusados.")
  }

  const { error } = await supabase
    .from("servico_acrescimo")
    .update({
      status: "recusado",
    })
    .eq("id", acrescimoId)

  if (error) {
    throw new Error(error.message)
  }

  if (acrescimo.servico_solicitado_id) {
    await atualizarUpdatedAtServicoSolicitado(acrescimo.servico_solicitado_id)

    const conversa = await getConversaPorServicoSolicitado(
      acrescimo.servico_solicitado_id
    )

    if (conversa) {
      await enviarMensagemChat(
        conversa.id,
        clienteId,
        `Acréscimo recusado pelo cliente: ${acrescimo.titulo ?? "Acréscimo"}.`
      )
    }
  }
}

export async function excluirAcrescimoAgendamento(
  acrescimoId: number,
  prestadorId: number
) {
  const supabase = createClient()

  const { data: acrescimo, error: buscaError } = await supabase
    .from("servico_acrescimo")
    .select("id, prestador_id, servico_solicitado_id, titulo, status")
    .eq("id", acrescimoId)
    .maybeSingle()

  if (buscaError) {
    throw new Error(buscaError.message)
  }

  if (!acrescimo) {
    throw new Error("Acréscimo não encontrado.")
  }

  if (acrescimo.prestador_id !== prestadorId) {
    throw new Error("Apenas o prestador pode excluir este acréscimo.")
  }

  if (acrescimo.status === "aceito") {
    throw new Error("Acréscimos aceitos não podem ser excluídos.")
  }

  const { error } = await supabase
    .from("servico_acrescimo")
    .delete()
    .eq("id", acrescimoId)

  if (error) {
    throw new Error(error.message)
  }

  if (acrescimo.servico_solicitado_id) {
    await atualizarUpdatedAtServicoSolicitado(acrescimo.servico_solicitado_id)

    const conversa = await getConversaPorServicoSolicitado(
      acrescimo.servico_solicitado_id
    )

    if (conversa) {
      await enviarMensagemChat(
        conversa.id,
        prestadorId,
        `Acréscimo excluído pelo prestador: ${acrescimo.titulo ?? "Acréscimo"}.`
      )
    }
  }
}