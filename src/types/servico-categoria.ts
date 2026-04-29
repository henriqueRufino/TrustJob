import type { Servico } from "./servico"

export type ServicoCategoria = {
  id: number
  nome: string
}

export type ServicoCategoriaComServicos = ServicoCategoria & {
  servicos: Servico[]
}