"use client"

import Image from "next/image"
import Link from "next/link"
import logo from "@/assets/footer/tcc_logo_footer.png"

const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Link href="/" className="inline-flex">
              <Image
                src={logo}
                alt="TrustJob"
                className="h-30 w-auto object-contain"
                priority
              />
            </Link>

            <p className="max-w-sm text-sm text-muted-foreground">
              Sistema desenvolvido como trabalho de conclusão de curso.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Navegação</h3>

            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-primary"
                >
                  Home
                </Link>
              </li>

              <li>
                <Link
                  href="/servicos-categoria"
                  className="transition-colors hover:text-primary"
                >
                  Serviços
                </Link>
              </li>

              <li>
                <Link
                  href="/conversas"
                  className="transition-colors hover:text-primary"
                >
                  Conversas
                </Link>
              </li>

              <li>
                <Link
                  href="/agendamentos"
                  className="transition-colors hover:text-primary"
                >
                  Agendamentos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Contato</h3>

            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Email: contato@trustjob.com</li>
              <li>Telefone: (19) 9 9999-9999</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TrustJob. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}

export default Footer