"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import logo from "@/assets/navbar/logo_tcc.png";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

const Navbar = () => {
  const [value, setValue] = React.useState<string | null>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const openMenu = (val: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setValue(val)
  }

  const closeMenu = () => {
    timeoutRef.current = setTimeout(() => {
      setValue(null)
    }, 250)
  }

  return (
    <div className="border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">

        <Link href="/page.tsx"><Image src={logo} className="h-[3rem] w-[6rem]" alt="TrustJob" priority /></Link>

        {/* Desktop navigation */}
        <div className="hidden md:block">
          <NavigationMenu value={value} onValueChange={setValue}>
            <NavigationMenuList className="flex items-center gap-6">

              <NavigationMenuItem
                value="servicos"
                onMouseEnter={() => openMenu("servicos")}
                onMouseLeave={closeMenu}
              >
                <Link
                  href="/servicos"
                  className="block rounded-md p-3 text-md hover:bg-muted hover:text-chart-5 font-bold transition-colors"
                >
                  Serviços
                </Link>

                <NavigationMenuContent
                  onMouseEnter={() => openMenu("servicos")}
                  onMouseLeave={closeMenu}
                >
                  <ul className="grid w-100 gap-3 p-4">
                    <li>
                      <Link href="/servicos/hidraulica" className="block rounded-md p-2 text-sm hover:bg-muted hover:text-chart-5 transition-colors text-center">Hidráulica</Link>
                    </li>
                    <li>
                      <Link href="/servicos/eletrica" className="block rounded-md p-2 text-sm hover:bg-muted hover:text-chart-5 transition-colors text-center">Elétrica</Link>
                    </li>
                    <li>
                      <Link href="/servicos/mecanica" className="block rounded-md p-2 text-sm hover:bg-muted hover:text-chart-5 transition-colors text-center">Mecânica</Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem
                value="prestadores"
                onMouseEnter={() => openMenu("prestadores")}
                onMouseLeave={closeMenu}
              >
                <Link
                  href="/prestadores"
                  className="block rounded-md p-3 text-md hover:bg-muted hover:text-chart-5 font-bold transition-colors"
                >
                  Prestadores
                </Link>

                <NavigationMenuContent
                  onMouseEnter={() => openMenu("prestadores")}
                  onMouseLeave={closeMenu}
                >
                  <ul className="grid w-100 gap-3 p-4">
                    <li>
                      <Link href="/prestadores/Venom" className="block rounded-md p-2 text-sm hover:bg-muted hover:text-chart-5 transition-colors text-center">Venom</Link>
                    </li>
                    <li>
                      <Link href="/prestadores/Feromonas" className="block rounded-md p-2 text-sm hover:bg-muted hover:text-chart-5 transition-colors text-center">Feromonas</Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  href="/login"
                  className="block rounded-md p-3 text-md hover:bg-muted hover:text-chart-5 font-bold transition-colors"
                >
                  Login
                </Link>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden">
          <button
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-md focus:outline-none focus:ring"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="p-4 flex flex-col gap-2">
            <Link href="/servicos" className="block rounded-md p-2 text-base font-bold hover:bg-muted transition-colors">Serviços</Link>
            <div className="pl-4">
              <Link href="/servicos/hidraulica" className="block p-2 text-sm hover:bg-muted transition-colors">Hidráulica</Link>
              <Link href="/servicos/eletrica" className="block p-2 text-sm hover:bg-muted transition-colors">Elétrica</Link>
              <Link href="/servicos/mecanica" className="block p-2 text-sm hover:bg-muted transition-colors">Mecânica</Link>
            </div>

            <Link href="/prestadores" className="block rounded-md p-2 text-base font-bold hover:bg-muted transition-colors">Prestadores</Link>
            <div className="pl-4">
              <Link href="/prestadores/Venom" className="block p-2 text-sm hover:bg-muted transition-colors">Venom</Link>
              <Link href="/prestadores/Feromonas" className="block p-2 text-sm hover:bg-muted transition-colors">Feromonas</Link>
            </div>

            <Link href="/login" className="block rounded-md p-2 text-base font-bold hover:bg-muted transition-colors">Login</Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default Navbar;