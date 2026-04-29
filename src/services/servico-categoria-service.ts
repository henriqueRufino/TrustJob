import { createClient } from "@/lib/supabase/server"
import type { ServicoCategoriaComServicos } from "@/types/servico-categoria"

export async function getCategoriasComServicos(): Promise<ServicoCategoriaComServicos[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("servico_categoria")
    .select(`
      id,
      nome,
      servicos:servico (
        id,
        nome,
        descricao,
        valor_recomendado,
        servico_categoria_id
      )
    `)

  if (error) {
  console.error("Erro Supabase:", error)

  throw new Error(error.message)
}

  return data ?? []
}