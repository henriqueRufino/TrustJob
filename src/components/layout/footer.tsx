"use client"

import Link from "next/link"

const Footer = () => {
    return (
        <footer className="border-t">
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Conteúdo principal */}
                <div className="flex flex-col md:flex-row justify-between gap-6 text-center md:text-left">

                {/* Logo / Nome */}
                <div>
                    <h2 className="text-lg font-bold">TrustJob</h2>
                    <p className="text-sm text-muted-foreground">
                    Sistema desenvolvido como trabalho de conclusão de curso.
                    </p>
                </div>

                {/* Links */}
                <div className="flex flex-col sm:flex-row gap-6">

                    <div>
                        <h3 className="text-sm font-semibold mb-2">Navegação</h3>
                        <ul className="space-y-1 text-sm">
                            <li>
                            <Link href="/" className="hover:text-primary transition-colors">
                                Home
                            </Link>
                            </li>
                            <li>
                            <Link href="/servicos" className="hover:text-primary transition-colors">
                                Serviços
                            </Link>
                            </li>
                            <li>
                            <Link href="/prestadores" className="hover:text-primary transition-colors">
                                Prestadores
                            </Link>
                            </li>
                        </ul>
                    </div>


                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                    
                    <div>
                        <h3 className="text-sm text-center font-semibold mb-2">Contato</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>Email: contato@trustjob.com</li>
                            <li>Telefone: (19) 9 9999-9999</li>
                        </ul>
                        </div>

                    </div>
                </div>

                {/* Linha inferior */}
                <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} TrustJob. Todos os direitos reservados.
                </div>

            </div>
        </footer>
    )
}

export default Footer;