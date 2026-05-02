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

  React.useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLogado(false)
        return
      }

      setLogado(true)

      const { data: perfil } = await supabase
        .from("user")
        .select("nome")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (perfil && perfil.nome) {
        setNomeUsuario(perfil.nome)
      } else {
        setNomeUsuario(null)
      }
    }

    carregarUsuario()
  }, [supabase])

  const perfilOuLogin = logado
    ? {
        href: "/perfil",
        label: nomeUsuario ? nomeUsuario : "Perfil",
      }
    : {
        href: "/login",
        label: "Login",
      }

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <Image src={logo} className="h-12 w-24" alt="TrustJob" priority />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/servicos"
            className="rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            Serviços
          </Link>

          <Link
            href="/prestadores"
            className="rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            Prestadores
          </Link>

          <Link
            href={perfilOuLogin.href}
            className="rounded-md p-3 text-base font-bold transition-colors hover:bg-muted hover:text-chart-5"
          >
            {perfilOuLogin.label}
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
              href="/servicos"
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-3 font-bold hover:bg-muted"
            >
              Serviços
            </Link>

            <Link
              href="/prestadores"
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-3 font-bold hover:bg-muted"
            >
              Prestadores
            </Link>

            <Link
              href={perfilOuLogin.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-3 font-bold hover:bg-muted"
            >
              {perfilOuLogin.label}
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}

export default Navbar