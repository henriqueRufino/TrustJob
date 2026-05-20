import RedefinirSenhaForm from "@/components/sections/redefinir-senha-form"

type PageProps = {
  searchParams: Promise<{
    code?: string
    token_hash?: string
    type?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const { code, token_hash, type } = await searchParams

  return (
    <RedefinirSenhaForm
      code={code ?? null}
      tokenHash={token_hash ?? null}
      type={type ?? null}
    />
  )
}