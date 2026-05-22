"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import logo from "@/assets/navbar/tcc_logo_navbar.png"
import { createClient } from "@/lib/supabase/client"

type ConversaNavbarRow = {
  id: number
  cliente_id: number
  prestador_id: number
  updated_at: string | null
  cliente_last_read_at: string | null
  prestador_last_read_at: string | null
}

type MensagemNavbarRow = {
  id: number
  conversa_id: number
  remetente_id: number
  created_at: string
}

type AgendamentoNavbarRow = {
  id: number
  cliente_id: number
  prestador_id: number
  servico_etapa_id: number | null
  updated_at: string | null
}

const Navbar = () => {
  const supabase = React.useMemo(() => createClient(), [])

  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [logado, setLogado] = React.useState(false)
  const [userId, setUserId] = React.useState<number | null>(null)
  const [nomeUsuario, setNomeUsuario] = React.useState<string | null>(null)
  const [fotoUsuario, setFotoUsuario] = React.useState<string | null>(null)

  const [quantidadeNotificacoesConversas, setQuantidadeNotificacoesConversas] =
    React.useState(0)

  const [
    quantidadeNotificacoesAgendamentos,
    setQuantidadeNotificacoesAgendamentos,
  ] = React.useState(0)

  const verificarNotificacoesConversas = React.useCallback(
    async (perfilId: number) => {
      const { data: conversas, error: conversasError } = await supabase
        .from("chat_conversa")
        .select(
          "id, cliente_id, prestador_id, updated_at, cliente_last_read_at, prestador_last_read_at"
        )
        .or(`cliente_id.eq.${perfilId},prestador_id.eq.${perfilId}`)

      if (conversasError) {
        setQuantidadeNotificacoesConversas(0)
        return
      }

      const conversasTyped = (conversas ?? []) as ConversaNavbarRow[]

      if (conversasTyped.length === 0) {
        setQuantidadeNotificacoesConversas(0)
        return
      }

      const conversaIds = conversasTyped.map((conversa) => conversa.id)

      const { data: mensagens, error: mensagensError } = await supabase
        .from("chat_mensagem")
        .select("id, conversa_id, remetente_id, created_at")
        .in("conversa_id", conversaIds)
        .neq("remetente_id", perfilId)
        .order("created_at", { ascending: false })

      if (mensagensError) {
        setQuantidadeNotificacoesConversas(0)
        return
      }

      const mensagensTyped = (mensagens ?? []) as MensagemNavbarRow[]

      const quantidadeMensagensNaoLidas = mensagensTyped.filter((mensagem) => {
        const conversa = conversasTyped.find(
          (item) => item.id === mensagem.conversa_id
        )

        if (!conversa) {
          return false
        }

        const usuarioEhCliente = conversa.cliente_id === perfilId

        const ultimaLeitura = usuarioEhCliente
          ? conversa.cliente_last_read_at
          : conversa.prestador_last_read_at

        if (!ultimaLeitura) {
          return true
        }

        return new Date(mensagem.created_at) > new Date(ultimaLeitura)
      }).length

      setQuantidadeNotificacoesConversas(quantidadeMensagensNaoLidas)
    },
    [supabase]
  )

  const verificarNotificacoesAgendamentos = React.useCallback(
    async (perfilId: number) => {
      const { data, error } = await supabase
        .from("servico_solicitado")
        .select("id, cliente_id, prestador_id, servico_etapa_id, updated_at")
        .or(`cliente_id.eq.${perfilId},prestador_id.eq.${perfilId}`)
        .gte("servico_etapa_id", 2)

      if (error) {
        setQuantidadeNotificacoesAgendamentos(0)
        return
      }

      const agendamentos = (data ?? []) as AgendamentoNavbarRow[]

      if (agendamentos.length === 0) {
        setQuantidadeNotificacoesAgendamentos(0)
        return
      }

      const ultimaLeitura = localStorage.getItem(
        `agendamentos:last-read:${perfilId}`
      )

      if (!ultimaLeitura) {
        setQuantidadeNotificacoesAgendamentos(agendamentos.length)
        return
      }

      const quantidadeNaoVistos = agendamentos.filter((agendamento) => {
        if (!agendamento.updated_at) {
          return false
        }

        return new Date(agendamento.updated_at) > new Date(ultimaLeitura)
      }).length

      setQuantidadeNotificacoesAgendamentos(quantidadeNaoVistos)
    },
    [supabase]
  )

  React.useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLogado(false)
        setUserId(null)
        setNomeUsuario(null)
        setFotoUsuario(null)
        setQuantidadeNotificacoesConversas(0)
        setQuantidadeNotificacoesAgendamentos(0)
        return
      }

      setLogado(true)

      const { data: perfil } = await supabase
        .from("user")
        .select("id, nome, foto")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      setUserId(perfil?.id ?? null)
      setNomeUsuario(perfil?.nome ?? null)
      setFotoUsuario(perfil?.foto ?? null)

      if (perfil?.id) {
        await verificarNotificacoesConversas(perfil.id)
        await verificarNotificacoesAgendamentos(perfil.id)
      } else {
        setQuantidadeNotificacoesConversas(0)
        setQuantidadeNotificacoesAgendamentos(0)
      }
    }

    carregarUsuario()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      carregarUsuario()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [
    supabase,
    verificarNotificacoesConversas,
    verificarNotificacoesAgendamentos,
  ])

  React.useEffect(() => {
    if (!userId) {
      return
    }

    const channel = supabase
      .channel(`navbar-chat-notificacoes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagem",
        },
        () => {
          verificarNotificacoesConversas(userId)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversa",
        },
        () => {
          verificarNotificacoesConversas(userId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, verificarNotificacoesConversas])

  React.useEffect(() => {
    if (!userId) {
      return
    }

    const channel = supabase
      .channel(`navbar-agendamentos-notificacoes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "servico_solicitado",
        },
        () => {
          verificarNotificacoesAgendamentos(userId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, verificarNotificacoesAgendamentos])

  React.useEffect(() => {
    if (!userId) {
      return
    }

    const usuarioIdAtual = userId

    function atualizarNotificacoesConversas() {
      verificarNotificacoesConversas(usuarioIdAtual)
    }

    window.addEventListener(
      "chat-notificacoes-atualizadas",
      atualizarNotificacoesConversas
    )

    return () => {
      window.removeEventListener(
        "chat-notificacoes-atualizadas",
        atualizarNotificacoesConversas
      )
    }
  }, [userId, verificarNotificacoesConversas])

  React.useEffect(() => {
    if (!userId) {
      return
    }

    const usuarioIdAtual = userId

    function atualizarNotificacoesAgendamentos() {
      verificarNotificacoesAgendamentos(usuarioIdAtual)
    }

    window.addEventListener(
      "agendamentos-notificacoes-atualizadas",
      atualizarNotificacoesAgendamentos
    )

    return () => {
      window.removeEventListener(
        "agendamentos-notificacoes-atualizadas",
        atualizarNotificacoesAgendamentos
      )
    }
  }, [userId, verificarNotificacoesAgendamentos])

  const perfilOuLogin = logado
    ? {
        href: "/perfil",
        label: nomeUsuario || "Perfil",
      }
    : {
        href: "/login",
        label: "Login",
      }

  const avatarSrc = fotoUsuario || "/avatar_padrao.png"

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <Image src={logo} className="h-12 w-14" alt="TrustJob" priority />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/servicos-categoria"
            className="rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            Serviços
          </Link>

          {logado && (
            <Link
              href="/conversas"
              className="relative rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
            >
              Conversas

              {quantidadeNotificacoesConversas > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white">
                  {quantidadeNotificacoesConversas}
                </span>
              )}
            </Link>
          )}

          {logado && (
            <Link
              href="/agendamentos"
              className="relative rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
            >
              Agendamentos

              {quantidadeNotificacoesAgendamentos > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white">
                  {quantidadeNotificacoesAgendamentos}
                </span>
              )}
            </Link>
          )}

          <Link
            href={perfilOuLogin.href}
            className="flex items-center gap-2 rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            {logado && (
              <Image
                src={avatarSrc}
                alt="Avatar do usuário"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                unoptimized
              />
            )}

            <span>{perfilOuLogin.label}</span>
          </Link>
        </nav>

        <button
          type="button"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-md p-2 transition-colors hover:bg-muted md:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t bg-background md:hidden">
          <div className="flex flex-col gap-2 p-4">
            <Link
              href="/servicos-categoria"
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-3 font-bold hover:bg-muted"
            >
              Serviços
            </Link>

            {logado && (
              <Link
                href="/conversas"
                onClick={() => setMobileOpen(false)}
                className="relative rounded-md p-3 font-bold hover:bg-muted"
              >
                Conversas

                {quantidadeNotificacoesConversas > 0 && (
                  <span className="absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white">
                    {quantidadeNotificacoesConversas}
                  </span>
                )}
              </Link>
            )}

            {logado && (
              <Link
                href="/agendamentos"
                onClick={() => setMobileOpen(false)}
                className="relative rounded-md p-3 font-bold hover:bg-muted"
              >
                Agendamentos

                {quantidadeNotificacoesAgendamentos > 0 && (
                  <span className="absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white">
                    {quantidadeNotificacoesAgendamentos}
                  </span>
                )}
              </Link>
            )}

            <Link
              href={perfilOuLogin.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-md p-3 font-bold hover:bg-muted"
            >
              {logado && (
                <Image
                  src={avatarSrc}
                  alt="Avatar do usuário"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                  unoptimized
                />
              )}

              <span>{perfilOuLogin.label}</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}

export default Navbar