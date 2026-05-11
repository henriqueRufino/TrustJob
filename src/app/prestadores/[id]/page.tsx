import PrestadorDetalhe from "@/components/sections/prestador-detalhe"

type PageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    servicoId?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { servicoId } = await searchParams

  return (
    <PrestadorDetalhe
      prestadorId={Number(id)}
      servicoId={servicoId ? Number(servicoId) : null}
    />
  )
}