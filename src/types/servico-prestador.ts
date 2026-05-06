export type PrestadorCatalogo = {
  id: number
  user_id: number
  servico_id: number
  nome: string
  foto: string | null
  cidade: string | null
  valor_medio: number | null
  media_avaliacoes: number
  total_avaliacoes: number
}