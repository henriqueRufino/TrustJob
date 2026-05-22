import { createClient } from "@/lib/supabase/client"

export type HomeSearchTipo = "categoria" | "servico" | "prestador"

export type HomeSearchResultado = {
  id: number
  tipo: HomeSearchTipo
  titulo: string
  descricao: string | null
  href: string
}

type ServicoCategoriaRow = {
  id: number
  nome: string | null
}

type ServicoRow = {
  id: number
  nome: string | null
  descricao: string | null
  servico_categoria:
    | {
        nome: string | null
      }
    | {
        nome: string | null
      }[]
    | null
}

type PrestadorRow = {
  id: number
  nome: string | null
  email: string | null
  user_address:
    | {
        cidade:
          | {
              nome: string | null
            }
          | {
              nome: string | null
            }[]
          | null
        estado:
          | {
              uf: string | null
            }
          | {
              uf: string | null
            }[]
          | null
      }
    | {
        cidade:
          | {
              nome: string | null
            }
          | {
              nome: string | null
            }[]
          | null
        estado:
          | {
              uf: string | null
            }
          | {
              uf: string | null
            }[]
          | null
      }[]
    | null
}

function getRelacaoUnica<T>(relacao: T | T[] | null | undefined) {
  return Array.isArray(relacao) ? relacao[0] : relacao
}

export async function buscarHome(
  termo: string
): Promise<HomeSearchResultado[]> {
  const supabase = createClient()

  const termoTratado = termo.trim()

  if (termoTratado.length < 2) {
    return []
  }

  const filtro = `%${termoTratado}%`

  const [categoriasResponse, servicosResponse, prestadoresResponse] =
    await Promise.all([
      supabase
        .from("servico_categoria")
        .select("id, nome")
        .ilike("nome", filtro)
        .limit(5),

      supabase
        .from("servico")
        .select(`
          id,
          nome,
          descricao,
          servico_categoria:servico_categoria_id (
            nome
          )
        `)
        .or(`nome.ilike.${filtro},descricao.ilike.${filtro}`)
        .limit(6),

      supabase
        .from("user")
        .select(`
          id,
          nome,
          email,
          user_address (
            cidade:cidade_id (
              nome
            ),
            estado:estado_id (
              uf
            )
          )
        `)
        .eq("tipo_user_id", 2)
        .or(`nome.ilike.${filtro},email.ilike.${filtro}`)
        .limit(6),
    ])

  if (categoriasResponse.error) {
    throw new Error(categoriasResponse.error.message)
  }

  if (servicosResponse.error) {
    throw new Error(servicosResponse.error.message)
  }

  if (prestadoresResponse.error) {
    throw new Error(prestadoresResponse.error.message)
  }

  const categorias = (categoriasResponse.data ??
    []) as unknown as ServicoCategoriaRow[]

  const servicos = (servicosResponse.data ?? []) as unknown as ServicoRow[]

  const prestadores = (prestadoresResponse.data ??
    []) as unknown as PrestadorRow[]

  const resultadosCategorias: HomeSearchResultado[] = categorias.map(
    (categoria) => ({
      id: categoria.id,
      tipo: "categoria",
      titulo: categoria.nome ?? "Categoria sem nome",
      descricao: "Categoria de serviço",
      href: `/servicos-categoria`,
    })
  )

  const resultadosServicos: HomeSearchResultado[] = servicos.map((servico) => {
    const categoria = getRelacaoUnica(servico.servico_categoria)

    return {
      id: servico.id,
      tipo: "servico",
      titulo: servico.nome ?? "Serviço sem nome",
      descricao: categoria?.nome
        ? `Serviço da categoria ${categoria.nome}`
        : servico.descricao,
      href: `/servicos/${servico.id}`,
    }
  })

  const resultadosPrestadores: HomeSearchResultado[] = prestadores.map(
    (prestador) => {
      const endereco = getRelacaoUnica(prestador.user_address)
      const cidade = getRelacaoUnica(endereco?.cidade)
      const estado = getRelacaoUnica(endereco?.estado)

      const localizacao = [cidade?.nome, estado?.uf].filter(Boolean).join(" - ")

      return {
        id: prestador.id,
        tipo: "prestador",
        titulo: prestador.nome ?? "Prestador sem nome",
        descricao: localizacao || "Prestador cadastrado",
        href: `/prestadores/${prestador.id}`,
      }
    }
  )

  return [
    ...resultadosCategorias,
    ...resultadosServicos,
    ...resultadosPrestadores,
  ]
}