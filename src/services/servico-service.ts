import { createClient } from "@/lib/supabase/server"

export async function getServicos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("servico")
    .select("*")
    .order("nome", { ascending: true })

  if (error) {
    console.error(error)
    throw new Error("Erro ao buscar serviços")
  }

  return data ?? []
}