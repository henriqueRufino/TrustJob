"use client"

import * as React from "react"
import Link from "next/link"
import type { ServicoCategoriaComServicos } from "@/types/servico-categoria"

type CatalogoServicosProps = {
  categorias: ServicoCategoriaComServicos[]
}

export default function CatalogoServicos({ categorias }: CatalogoServicosProps) {
  const [aberto, setAberto] = React.useState<number | null>(null)

  const toggle = (id: number) => {
    setAberto(aberto === id ? null : id)
  }

  return (
    <section className="flex w-full justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">
            Categorias de serviços
          </h1>

          <p className="text-sm text-muted-foreground md:text-base">
            Escolha uma categoria para visualizar os serviços disponíveis.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(categoria.id)}
                className="flex w-full flex-col gap-1 p-4 text-left transition hover:bg-muted md:p-5"
              >
                <span className="font-semibold">{categoria.nome}</span>
              </button>

              {aberto === categoria.id && (
                <div className="flex flex-col gap-3 border-t p-4 md:p-5">
                  {categoria.servicos.length > 0 ? (
                    categoria.servicos.map((servico) => (
                      <Link
                        key={servico.id}
                        href={`/servicos/${servico.id}`}
                        className="flex flex-col gap-2 rounded-xl border bg-background p-4 transition hover:bg-muted md:p-5"
                      >
                        <p className="font-semibold">{servico.nome}</p>

                        {servico.descricao && (
                          <p className="text-sm text-muted-foreground">
                            {servico.descricao}
                          </p>
                        )}

                        {servico.valor_recomendado !== null &&
                          servico.valor_recomendado !== undefined && (
                            <p className="text-sm font-medium text-chart-5">
                              Valor recomendado: R$ {servico.valor_recomendado}
                            </p>
                          )}
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum serviço encontrado para esta categoria.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}