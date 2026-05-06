import ServicoDetalhe from "@/components/sections/servico-detalhe"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <ServicoDetalhe servicoId={Number(id)} />
}