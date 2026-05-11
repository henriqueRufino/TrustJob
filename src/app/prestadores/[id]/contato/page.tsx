import IniciarChat from "@/components/sections/iniciar-chat"

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
    <IniciarChat
      prestadorId={Number(id)}
      servicoId={servicoId ? Number(servicoId) : null}
    />
  )
}