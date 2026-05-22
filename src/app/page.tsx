"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import {
  buscarHome,
  type HomeSearchResultado,
  type HomeSearchTipo,
} from "@/services/home-search-service"

const Home = () => {
  const [termoBusca, setTermoBusca] = React.useState("")
  const [resultados, setResultados] = React.useState<HomeSearchResultado[]>([])
  const [buscando, setBuscando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mostrarResultados, setMostrarResultados] = React.useState(false)

  React.useEffect(() => {
    const termoTratado = termoBusca.trim()

    if (termoTratado.length < 2) {
      setResultados([])
      setMostrarResultados(false)
      setErro(null)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setBuscando(true)
      setErro(null)

      try {
        const resultadosData = await buscarHome(termoTratado)

        setResultados(resultadosData)
        setMostrarResultados(true)
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Erro ao buscar.")
        setResultados([])
        setMostrarResultados(true)
      }

      setBuscando(false)
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [termoBusca])

  function getLabelTipo(tipo: HomeSearchTipo) {
    if (tipo === "categoria") return "Categoria"
    if (tipo === "servico") return "Serviço"

    return "Prestador"
  }

  function getClasseTipo(tipo: HomeSearchTipo) {
    if (tipo === "categoria") return "bg-purple-100 text-purple-700"
    if (tipo === "servico") return "bg-blue-100 text-blue-700"

    return "bg-green-100 text-green-700"
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (resultados.length > 0) {
      window.location.href = resultados[0].href
    }
  }

  return (
    <section className="flex flex-1 w-full bg-primary-foreground">
      <div className="flex flex-1 w-full items-center justify-center bg-primary-foreground px-4 py-12 md:px-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:gap-24">
          <div className="flex flex-col items-center gap-20 text-center">
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-black md:text-6xl">
              Cadastre seus serviços ou encontre profissionais de confiança
            </h1>

            <p className="max-w-2xl text-sm text-black/85 md:text-base text-justify">
              Busque por categorias, serviços e profissionais perto de você.
            </p>
          </div>

          <div className="relative w-full max-w-4xl">
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-3 rounded-2xl bg-background p-3 shadow-lg md:flex-row md:items-center"
            >
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-input bg-background px-4 py-4">
                <Search className="h-5 w-5 text-muted-foreground" />

                <input
                  type="text"
                  value={termoBusca}
                  onChange={(event) => setTermoBusca(event.target.value)}
                  onFocus={() => {
                    if (resultados.length > 0 || erro) {
                      setMostrarResultados(true)
                    }
                  }}
                  placeholder="O que você está procurando hoje?"
                  className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex h-14 items-center justify-center rounded-xl bg-chart-1 px-8 text-base font-semibold text-black transition hover:opacity-90 md:min-w-40"
              >
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {mostrarResultados && (
              <div className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-background shadow-xl">
                {erro ? (
                  <p className="p-4 text-sm text-red-500">{erro}</p>
                ) : buscando ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Buscando resultados...
                  </p>
                ) : resultados.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {resultados.map((resultado) => (
                      <Link
                        key={`${resultado.tipo}-${resultado.id}`}
                        href={resultado.href}
                        onClick={() => setMostrarResultados(false)}
                        className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 transition last:border-b-0 hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">
                              {resultado.titulo}
                            </p>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${getClasseTipo(
                                resultado.tipo
                              )}`}
                            >
                              {getLabelTipo(resultado.tipo)}
                            </span>
                          </div>

                          {resultado.descricao && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {resultado.descricao}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          Abrir
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    Nenhum resultado encontrado.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Home