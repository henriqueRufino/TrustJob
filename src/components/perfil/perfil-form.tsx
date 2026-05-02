"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import type { Estado } from "@/types/estado"
import type { Cidade } from "@/types/cidade"
import { getEstados, getCidadesPorEstado } from "@/services/localizacao-service"

export default function PerfilForm() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = React.useState<number | null>(null)

  const [nome, setNome] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [telefone, setTelefone] = React.useState("")
  const [dataNascimento, setDataNascimento] = React.useState("")

  const [logradouro, setLogradouro] = React.useState("")
  const [numero, setNumero] = React.useState("")
  const [complemento, setComplemento] = React.useState("")
  const [bairro, setBairro] = React.useState("")
  const [cep, setCep] = React.useState("")

  const [estados, setEstados] = React.useState<Estado[]>([])
  const [cidades, setCidades] = React.useState<Cidade[]>([])
  const [estadoId, setEstadoId] = React.useState("")
  const [cidadeId, setCidadeId] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [mensagem, setMensagem] = React.useState<string | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  function formatarTelefone(value: string) {
    const numeros = value.replace(/\D/g, "").slice(0, 11)

    if (numeros.length <= 2) return numeros

    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }

  function formatarCep(value: string) {
    const numeros = value.replace(/\D/g, "").slice(0, 8)

    if (numeros.length <= 5) return numeros

    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
  }

  React.useEffect(() => {
    async function carregarPerfil() {
      const estadosData = await getEstados()
      setEstados(estadosData)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setEmail(user.email ?? "")

      const { data: perfil } = await supabase
        .from("user")
        .select("id, nome, email, telefone, data_nascimento")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (perfil) {
        setUserId(perfil.id)
        setNome(perfil.nome ?? "")
        setTelefone(formatarTelefone(perfil.telefone ?? ""))
        setDataNascimento(perfil.data_nascimento ?? "")

        const { data: endereco } = await supabase
          .from("user_address")
          .select("id, logradouro, numero, complemento, bairro, cep, estado_id, cidade_id")
          .eq("user_id", perfil.id)
          .maybeSingle()

        if (endereco) {
          setLogradouro(endereco.logradouro ?? "")
          setNumero(endereco.numero ?? "")
          setComplemento(endereco.complemento ?? "")
          setBairro(endereco.bairro ?? "")
          setCep(formatarCep(endereco.cep ?? ""))

          setEstadoId(endereco.estado_id ? String(endereco.estado_id) : "")
          setCidadeId(endereco.cidade_id ? String(endereco.cidade_id) : "")

          if (endereco.estado_id) {
            const cidadesData = await getCidadesPorEstado(endereco.estado_id)
            setCidades(cidadesData)
          }
        }
      }

      setLoading(false)
    }

    carregarPerfil()
  }, [router, supabase])

  async function handleEstadoChange(value: string) {
    setEstadoId(value)
    setCidadeId("")

    if (!value) {
      setCidades([])
      return
    }

    const cidadesData = await getCidadesPorEstado(Number(value))
    setCidades(cidadesData)
  }

  async function salvarPerfil(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSalvando(true)
    setErro(null)
    setMensagem(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const telefoneLimpo = telefone.replace(/\D/g, "")
    const cepLimpo = cep.replace(/\D/g, "")

    let perfilId = userId

    if (perfilId) {
      const { error } = await supabase
        .from("user")
        .update({
          nome,
          telefone: telefoneLimpo,
          data_nascimento: dataNascimento || null,
        })
        .eq("id", perfilId)

      if (error) {
        setErro(error.message)
        setSalvando(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from("user")
        .insert({
          auth_user_id: user.id,
          email: user.email ?? email,
          nome,
          telefone: telefoneLimpo,
          data_nascimento: dataNascimento || null,
        })
        .select("id")
        .single()

      if (error) {
        setErro(error.message)
        setSalvando(false)
        return
      }

      perfilId = data.id
      setUserId(data.id)
    }

    const enderecoPayload = {
      logradouro,
      numero,
      complemento,
      bairro,
      cep: cepLimpo,
      estado_id: estadoId ? Number(estadoId) : null,
      cidade_id: cidadeId ? Number(cidadeId) : null,
    }

    const { data: enderecoExistente, error: enderecoBuscaError } = await supabase
      .from("user_address")
      .select("id")
      .eq("user_id", perfilId)
      .maybeSingle()

    if (enderecoBuscaError) {
      setErro(enderecoBuscaError.message)
      setSalvando(false)
      return
    }

    if (enderecoExistente) {
      const { error: enderecoUpdateError } = await supabase
        .from("user_address")
        .update(enderecoPayload)
        .eq("id", enderecoExistente.id)

      if (enderecoUpdateError) {
        setErro(enderecoUpdateError.message)
        setSalvando(false)
        return
      }
    } else {
      const { error: enderecoInsertError } = await supabase
        .from("user_address")
        .insert({
          user_id: perfilId,
          ...enderecoPayload,
        })

      if (enderecoInsertError) {
        setErro(enderecoInsertError.message)
        setSalvando(false)
        return
      }
    }

    setMensagem("Perfil salvo com sucesso!")
    setSalvando(false)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (loading) {
    return <div className="py-10 text-center">Carregando...</div>
  }

  return (
    <section className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl border p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">Meu perfil</h1>

        <form onSubmit={salvarPerfil} className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="h-11 rounded-xl border px-3"
            />

            <input
              value={email}
              disabled
              className="h-11 rounded-xl border bg-muted px-3"
            />

            <input
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="Telefone"
              className="h-11 rounded-xl border px-3"
            />

            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="h-11 rounded-xl border px-3"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              placeholder="Logradouro"
              className="h-11 rounded-xl border px-3"
            />

            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número"
              className="h-11 rounded-xl border px-3"
            />

            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Complemento"
              className="h-11 rounded-xl border px-3"
            />

            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Bairro"
              className="h-11 rounded-xl border px-3"
            />

            <select
              value={estadoId}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="h-11 rounded-xl border px-3"
            >
              <option value="">Estado</option>
              {estados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} - {e.uf}
                </option>
              ))}
            </select>

            <select
              value={cidadeId}
              onChange={(e) => setCidadeId(e.target.value)}
              disabled={!estadoId}
              className="h-11 rounded-xl border px-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Cidade</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <input
              value={cep}
              onChange={(e) => setCep(formatarCep(e.target.value))}
              placeholder="CEP"
              className="h-11 rounded-xl border px-3 md:col-span-2"
            />
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}
          {mensagem && <p className="text-sm text-green-600">{mensagem}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={sair}
              className="rounded-xl border px-6 py-3"
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}