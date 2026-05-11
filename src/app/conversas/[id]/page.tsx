import ChatConversa from "@/components/sections/chat-conversa"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return <ChatConversa conversaId={Number(id)} />
}