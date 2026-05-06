"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import logo from "@/assets/navbar/logo_tcc.png"
import { createClient } from "@/lib/supabase/client"

const Navbar = () => {
  const supabase = createClient()

  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [logado, setLogado] = React.useState(false)
  const [nomeUsuario, setNomeUsuario] = React.useState<string | null>(null)
  const [fotoUsuario, setFotoUsuario] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLogado(false)
        setNomeUsuario(null)
        setFotoUsuario(null)
        return
      }

      setLogado(true)

      const { data: perfil } = await supabase
        .from("user")
        .select("nome, foto")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      setNomeUsuario(perfil?.nome ?? null)
      setFotoUsuario(perfil?.foto ?? null)
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
  }, [supabase])

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
          <Image src={logo} className="h-12 w-24" alt="TrustJob" priority />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/servicos-categoria"
            className="rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            Serviços
          </Link>

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