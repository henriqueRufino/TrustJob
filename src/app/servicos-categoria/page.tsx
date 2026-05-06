import CatalogoServicos from "@/components/sections/servico"
import { getCategoriasComServicos } from "@/services/servico-categoria-service"

export default async function Page() {
  const categorias = await getCategoriasComServicos()

  return <CatalogoServicos categorias={categorias} />
}