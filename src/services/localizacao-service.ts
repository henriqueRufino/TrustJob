import { createClient } from "@/lib/supabase/client"
import type { Estado } from "@/types/estado"
import type { Cidade } from "@/types/cidade"

export async function getEstados(): Promise<Estado[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("estado")
    .select("id, nome, uf")
    .order("nome", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getCidadesPorEstado(estadoId: number): Promise<Cidade[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("cidade")
    .select("id, estado_id, nome")
    .eq("estado_id", estadoId)
    .order("nome", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}