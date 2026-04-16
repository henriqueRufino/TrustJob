"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

type Prestador = {
  id: number
  nome: string
  endereco: string
  nota: number
  foto: string
}

type Servico = {
  id: number
  titulo: string
  prestadores: Prestador[]
}

const servicos: Servico[] = [
  {
    id: 1,
    titulo: "Eletricista",
    prestadores: [
      {
        id: 1,
        nome: "João Silva",
        endereco: "Campinas - SP",
        nota: 4,
        foto: "https://via.placeholder.com/80",
      },
      {
        id: 2,
        nome: "Carlos Souza",
        endereco: "Campinas - SP",
        nota: 5,
        foto: "https://via.placeholder.com/80",
      },
    ],
  },
  {
    id: 2,
    titulo: "Encanador",
    prestadores: [
      {
        id: 3,
        nome: "Pedro Lima",
        endereco: "Campinas - SP",
        nota: 3,
        foto: "https://via.placeholder.com/80",
      },
    ],
  },
]

export default function CatalogoServicos() {
  const [aberto, setAberto] = React.useState<number | null>(null)

  const toggle = (id: number) => {
    setAberto(aberto === id ? null : id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      <h1 className="text-2xl font-bold mb-6">Serviços</h1>

      <div className="space-y-4">
        {servicos.map((servico) => (
          <div key={servico.id} className="border rounded-lg overflow-hidden">

            {/* Título do serviço */}
            <button
              onClick={() => toggle(servico.id)}
              className="w-full text-left p-4 font-semibold hover:bg-muted transition"
            >
              {servico.titulo}
            </button>

            {/* Lista de prestadores */}
            {aberto === servico.id && (
              <div className="border-t p-4 space-y-3">

                {servico.prestadores.map((p) => (
                  <Link
                    key={p.id}
                    href={`/prestador/${p.id}`}
                    className="flex items-center gap-4 p-3 rounded-md hover:bg-muted transition"
                  >
                    
                    {/* Foto */}
                    <Image
                      src={p.foto}
                      alt={p.nome}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />

                    {/* Infos */}
                    <div className="flex-1">
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.endereco}
                      </p>

                      {/* Estrelas */}
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>
                            {i < p.nota ? "⭐" : "☆"}
                          </span>
                        ))}
                      </div>
                    </div>

                  </Link>
                ))}

              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  )
}