import { createClient } from "@/lib/supabase/client"

export type UsuarioChat = {
  id: number
  nome: string | null
  email: string | null
  foto: string | null
  tipo_user_id: number | null
}

export type ChatConversa = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  created_at: string
  updated_at: string
}

export type ChatMensagem = {
  id: number
  conversa_id: number
  remetente_id: number
  mensagem: string
  created_at: string
  remetente_nome: string | null
  remetente_foto: string | null
}

type ChatMensagemRow = {
  id: number
  conversa_id: number
  remetente_id: number
  mensagem: string
  created_at: string
  remetente:
    | {
        nome: string | null
        foto: string | null
      }
    | {
        nome: string | null
        foto: string | null
      }[]
    | null
}

export async function getUsuarioLogadoChat(): Promise<UsuarioChat | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("user")
    .select("id, nome, email, foto, tipo_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getUsuarioChatPorId(
  userId: number
): Promise<UsuarioChat | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("user")
    .select("id, nome, email, foto, tipo_user_id")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getOrCreateConversa(
  clienteId: number,
  prestadorId: number,
  servicoId?: number | null
): Promise<ChatConversa> {
  const supabase = createClient()

  let conversaQuery = supabase
    .from("chat_conversa")
    .select("id, cliente_id, prestador_id, servico_id, created_at, updated_at")
    .eq("cliente_id", clienteId)
    .eq("prestador_id", prestadorId)

  if (servicoId) {
    conversaQuery = conversaQuery.eq("servico_id", servicoId)
  } else {
    conversaQuery = conversaQuery.is("servico_id", null)
  }

  const { data: conversaExistente, error: conversaBuscaError } =
    await conversaQuery.maybeSingle()

  if (conversaBuscaError) {
    throw new Error(conversaBuscaError.message)
  }

  if (conversaExistente) {
    return conversaExistente
  }

  const { data: novaConversa, error: conversaInsertError } = await supabase
    .from("chat_conversa")
    .insert({
      cliente_id: clienteId,
      prestador_id: prestadorId,
      servico_id: servicoId ?? null,
    })
    .select("id, cliente_id, prestador_id, servico_id, created_at, updated_at")
    .single()

  if (conversaInsertError) {
    throw new Error(conversaInsertError.message)
  }

  return novaConversa
}

export async function getMensagensPorConversa(
  conversaId: number
): Promise<ChatMensagem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chat_mensagem")
    .select(`
      id,
      conversa_id,
      remetente_id,
      mensagem,
      created_at,
      remetente:remetente_id (
        nome,
        foto
      )
    `)
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const mensagens = (data ?? []) as unknown as ChatMensagemRow[]

  return mensagens.map((mensagem) => {
    const remetente = Array.isArray(mensagem.remetente)
      ? mensagem.remetente[0]
      : mensagem.remetente

    return {
      id: mensagem.id,
      conversa_id: mensagem.conversa_id,
      remetente_id: mensagem.remetente_id,
      mensagem: mensagem.mensagem,
      created_at: mensagem.created_at,
      remetente_nome: remetente?.nome ?? null,
      remetente_foto: remetente?.foto ?? null,
    }
  })
}

export async function enviarMensagemChat(
  conversaId: number,
  remetenteId: number,
  mensagem: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chat_mensagem")
    .insert({
      conversa_id: conversaId,
      remetente_id: remetenteId,
      mensagem,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await supabase
    .from("chat_conversa")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversaId)

  return data
}

export type ChatConversaLista = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  created_at: string
  updated_at: string | null
  cliente_last_read_at: string | null
  prestador_last_read_at: string | null
  outro_usuario_id: number
  outro_usuario_nome: string | null
  outro_usuario_foto: string | null
  servico_nome: string | null
  ultima_mensagem: string | null
  ultima_mensagem_created_at: string | null
  ultima_mensagem_remetente_id: number | null
  quantidade_mensagens_nao_lidas: number
}

type ChatConversaListaRow = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  created_at: string
  updated_at: string | null
  cliente_last_read_at: string | null
  prestador_last_read_at: string | null
  cliente:
    | {
        nome: string | null
        foto: string | null
      }
    | {
        nome: string | null
        foto: string | null
      }[]
    | null
  prestador:
    | {
        nome: string | null
        foto: string | null
      }
    | {
        nome: string | null
        foto: string | null
      }[]
    | null
  servico:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
  chat_mensagem:
    | {
        id: number
        remetente_id: number
        mensagem: string | null
        created_at: string | null
      }[]
    | null
}

export async function getConversasDoUsuarioLogado(): Promise<ChatConversaLista[]> {
  const supabase = createClient()

  const usuarioLogado = await getUsuarioLogadoChat()

  if (!usuarioLogado) {
    return []
  }

  const { data, error } = await supabase
    .from("chat_conversa")
    .select(`
      id,
      cliente_id,
      prestador_id,
      servico_id,
      created_at,
      updated_at,
      cliente_last_read_at,
      prestador_last_read_at,
      cliente:cliente_id (
        nome,
        foto
      ),
      prestador:prestador_id (
        nome,
        foto
      ),
      servico:servico_id (
        nome
      ),
      chat_mensagem (
        id,
        remetente_id,
        mensagem,
        created_at
      )
    `)
    .or(`cliente_id.eq.${usuarioLogado.id},prestador_id.eq.${usuarioLogado.id}`)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const conversas = (data ?? []) as unknown as ChatConversaListaRow[]

  return conversas.map((conversa) => {
    const cliente = Array.isArray(conversa.cliente)
      ? conversa.cliente[0]
      : conversa.cliente

    const prestador = Array.isArray(conversa.prestador)
      ? conversa.prestador[0]
      : conversa.prestador

    const servico = Array.isArray(conversa.servico)
      ? conversa.servico[0]
      : conversa.servico

    const usuarioLogadoEhCliente = conversa.cliente_id === usuarioLogado.id

    const outroUsuario = usuarioLogadoEhCliente ? prestador : cliente

    const outroUsuarioId = usuarioLogadoEhCliente
      ? conversa.prestador_id
      : conversa.cliente_id

    const mensagensOrdenadas = [...(conversa.chat_mensagem ?? [])].sort(
      (a, b) => {
        const dataA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dataB = b.created_at ? new Date(b.created_at).getTime() : 0

        return dataB - dataA
      }
    )

    const ultimaMensagem = mensagensOrdenadas[0] ?? null

    const ultimaLeitura = usuarioLogadoEhCliente
      ? conversa.cliente_last_read_at
      : conversa.prestador_last_read_at    

    const quantidadeMensagensNaoLidas = mensagensOrdenadas.filter((mensagem) => {
      if (!mensagem.created_at) {
        return false
      }

      if (mensagem.remetente_id === usuarioLogado.id) {
        return false
      }

      if (!ultimaLeitura) {
        return true
      }

      return new Date(mensagem.created_at) > new Date(ultimaLeitura)
    }).length

    return {
      id: conversa.id,
      cliente_id: conversa.cliente_id,
      prestador_id: conversa.prestador_id,
      servico_id: conversa.servico_id,
      created_at: conversa.created_at,
      updated_at: conversa.updated_at,
      cliente_last_read_at: conversa.cliente_last_read_at,
      prestador_last_read_at: conversa.prestador_last_read_at,
      outro_usuario_id: outroUsuarioId,
      outro_usuario_nome: outroUsuario?.nome ?? null,
      outro_usuario_foto: outroUsuario?.foto ?? null,
      servico_nome: servico?.nome ?? null,
      ultima_mensagem: ultimaMensagem?.mensagem ?? null,
      ultima_mensagem_created_at: ultimaMensagem?.created_at ?? null,
      ultima_mensagem_remetente_id: ultimaMensagem?.remetente_id ?? null,
      quantidade_mensagens_nao_lidas: quantidadeMensagensNaoLidas
    }
  })
}

export type ChatConversaDetalhe = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  created_at: string
  updated_at: string | null
  cliente_last_read_at: string | null
  prestador_last_read_at: string | null
  cliente_nome: string | null
  cliente_foto: string | null
  prestador_nome: string | null
  prestador_foto: string | null
  servico_nome: string | null
}

type ChatConversaDetalheRow = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_id: number | null
  created_at: string
  updated_at: string | null
  cliente_last_read_at: string | null
  prestador_last_read_at: string | null
  cliente:
    | {
        nome: string | null
        foto: string | null
      }
    | {
        nome: string | null
        foto: string | null
      }[]
    | null
  prestador:
    | {
        nome: string | null
        foto: string | null
      }
    | {
        nome: string | null
        foto: string | null
      }[]
    | null
  servico:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
}

export async function getConversaPorId(
  conversaId: number
): Promise<ChatConversaDetalhe | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chat_conversa")
    .select(`
      id,
      cliente_id,
      prestador_id,
      servico_id,
      created_at,
      updated_at,
      cliente_last_read_at,
      prestador_last_read_at,
      cliente:cliente_id (
        nome,
        foto
      ),
      prestador:prestador_id (
        nome,
        foto
      ),
      servico:servico_id (
        nome
      )
    `)
    .eq("id", conversaId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const conversa = data as unknown as ChatConversaDetalheRow

  const cliente = Array.isArray(conversa.cliente)
    ? conversa.cliente[0]
    : conversa.cliente

  const prestador = Array.isArray(conversa.prestador)
    ? conversa.prestador[0]
    : conversa.prestador

  const servico = Array.isArray(conversa.servico)
    ? conversa.servico[0]
    : conversa.servico

  return {
    id: conversa.id,
    cliente_id: conversa.cliente_id,
    prestador_id: conversa.prestador_id,
    servico_id: conversa.servico_id,
    created_at: conversa.created_at,
    updated_at: conversa.updated_at,
    cliente_last_read_at: conversa.cliente_last_read_at,
    prestador_last_read_at: conversa.prestador_last_read_at,
    cliente_nome: cliente?.nome ?? null,
    cliente_foto: cliente?.foto ?? null,
    prestador_nome: prestador?.nome ?? null,
    prestador_foto: prestador?.foto ?? null,
    servico_nome: servico?.nome ?? null,
  }
}

export async function marcarConversaComoLida(
  conversaId: number,
  usuarioId: number
) {
  const supabase = createClient()

  const conversa = await getConversaPorId(conversaId)

  if (!conversa) {
    return
  }

  const campoLeitura =
    conversa.cliente_id === usuarioId
      ? "cliente_last_read_at"
      : conversa.prestador_id === usuarioId
        ? "prestador_last_read_at"
        : null

  if (!campoLeitura) {
    return
  }

  const { error } = await supabase
    .from("chat_conversa")
    .update({
      [campoLeitura]: new Date().toISOString(),
    })
    .eq("id", conversaId)

  if (error) {
    throw new Error(error.message)
  }
}