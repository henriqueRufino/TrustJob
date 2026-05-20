"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import type { Estado } from "@/types/estado"
import type { Cidade } from "@/types/cidade"
import { getEstados, getCidadesPorEstado } from "@/services/localizacao-service"

type ViaCepResponse = {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  estado?: string
  erro?: boolean
}

export default function PerfilForm() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [userId, setUserId] = React.useState<number | null>(null)

  const [nome, setNome] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [telefone, setTelefone] = React.useState("")
  const [cpf, setCpf] = React.useState("")
  const [dataNascimento, setDataNascimento] = React.useState("")

  const fotoInputRef = React.useRef<HTMLInputElement | null>(null)
  const ultimoCepBuscadoRef = React.useRef<string | null>(null)

  const [fotoFile, setFotoFile] = React.useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = React.useState<string | null>(null)
  const [fotoNome, setFotoNome] = React.useState("")

  const [logradouro, setLogradouro] = React.useState("")
  const [numero, setNumero] = React.useState("")
  const [complemento, setComplemento] = React.useState("")
  const [bairro, setBairro] = React.useState("")
  const [cep, setCep] = React.useState("")

  const [estados, setEstados] = React.useState<Estado[]>([])
  const [cidades, setCidades] = React.useState<Cidade[]>([])
  const [estadoId, setEstadoId] = React.useState("")
  const [cidadeId, setCidadeId] = React.useState("")

  const [buscandoCep, setBuscandoCep] = React.useState(false)
  const [erroCep, setErroCep] = React.useState<string | null>(null)

  const [loading, setLoading] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [mensagem, setMensagem] = React.useState<string | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  function limparNumeros(value: string) {
    return value.replace(/\D/g, "")
  }

  function normalizarTexto(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
  }

const formatarTelefone = React.useCallback((value: string) => {
  const numeros = limparNumeros(value).slice(0, 11)

  if (numeros.length <= 2) return numeros

  if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
}, [])

const formatarCpf = React.useCallback((value: string) => {
  const numeros = limparNumeros(value).slice(0, 11)

  if (numeros.length <= 3) return numeros

  if (numeros.length <= 6) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
  }

  if (numeros.length <= 9) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`
}, [])

const formatarCep = React.useCallback((value: string) => {
  const numeros = limparNumeros(value).slice(0, 8)

  if (numeros.length <= 5) return numeros

  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}, [])

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
        .select("id, nome, email, telefone, cpf, foto, data_nascimento")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (perfil) {
        setUserId(perfil.id)
        setNome(perfil.nome ?? "")
        setTelefone(formatarTelefone(perfil.telefone ?? ""))
        setCpf(formatarCpf(perfil.cpf ?? ""))
        setFotoPreview(perfil.foto ?? null)
        setDataNascimento(perfil.data_nascimento ?? "")

        const { data: endereco } = await supabase
          .from("user_address")
          .select(
            "id, logradouro, numero, complemento, bairro, cep, estado_id, cidade_id"
          )
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
  }, [router, supabase, formatarTelefone, formatarCpf, formatarCep])

  async function buscarEnderecoPorCep(cepInformado: string) {
    const cepLimpo = limparNumeros(cepInformado)

    if (cepLimpo.length !== 8) {
      setErroCep("Digite um CEP válido com 8 números.")
      return
    }

    if (ultimoCepBuscadoRef.current === cepLimpo) {
      return
    }

    ultimoCepBuscadoRef.current = cepLimpo
    setBuscandoCep(true)
    setErroCep(null)

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)

      if (!resposta.ok) {
        throw new Error("Não foi possível consultar o CEP.")
      }

      const endereco = (await resposta.json()) as ViaCepResponse

      if (endereco.erro) {
        setErroCep("CEP não encontrado.")
        setBuscandoCep(false)
        return
      }

      setCep(formatarCep(endereco.cep || cepLimpo))
      setLogradouro(endereco.logradouro ?? "")
      setBairro(endereco.bairro ?? "")

      if (endereco.complemento) {
        setComplemento(endereco.complemento)
      }

      const estadoEncontrado = estados.find(
        (estado) => estado.uf?.toUpperCase() === endereco.uf.toUpperCase()
      )

      if (!estadoEncontrado) {
        setEstadoId("")
        setCidadeId("")
        setCidades([])
        setErroCep(`Estado ${endereco.uf} não encontrado no banco.`)
        setBuscandoCep(false)
        return
      }

      setEstadoId(String(estadoEncontrado.id))

      const cidadesData = await getCidadesPorEstado(Number(estadoEncontrado.id))
      setCidades(cidadesData)

      const cidadeEncontrada = cidadesData.find(
        (cidade) =>
          normalizarTexto(cidade.nome ?? "") ===
          normalizarTexto(endereco.localidade)
      )

      if (!cidadeEncontrada) {
        setCidadeId("")
        setErroCep(
          `Cidade "${endereco.localidade}" não encontrada no banco para ${endereco.uf}.`
        )
        setBuscandoCep(false)
        return
      }

      setCidadeId(String(cidadeEncontrada.id))
    } catch (error) {
      ultimoCepBuscadoRef.current = null
      setErroCep(
        error instanceof Error ? error.message : "Erro ao consultar o CEP."
      )
    }

    setBuscandoCep(false)
  }

  function handleCepChange(value: string) {
    const cepFormatado = formatarCep(value)
    const cepLimpo = limparNumeros(cepFormatado)

    setCep(cepFormatado)
    setErroCep(null)

    if (cepLimpo.length < 8) {
      ultimoCepBuscadoRef.current = null
    }

    if (cepLimpo.length === 8) {
      buscarEnderecoPorCep(cepFormatado)
    }
  }

  function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setFotoFile(file)
    setFotoNome(file.name)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function uploadFoto(perfilId: number) {
    if (!fotoFile) return null

    const extensao = fotoFile.name.split(".").pop()
    const nomeArquivo = `user-${perfilId}-${Date.now()}.${extensao}`
    const caminhoArquivo = `usuarios/${perfilId}/${nomeArquivo}`

    const { error } = await supabase.storage
      .from("pictures")
      .upload(caminhoArquivo, fotoFile, {
        upsert: true,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data } = supabase.storage
      .from("pictures")
      .getPublicUrl(caminhoArquivo)

    return data.publicUrl
  }

  async function handleEstadoChange(value: string) {
    setEstadoId(value)
    setCidadeId("")
    setErroCep(null)
    ultimoCepBuscadoRef.current = null

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
    const cpfLimpo = cpf.replace(/\D/g, "")
    const cepLimpo = cep.replace(/\D/g, "")

    let perfilId = userId

    if (!perfilId) {
      const { data, error } = await supabase
        .from("user")
        .insert({
          auth_user_id: user.id,
          email: user.email ?? email,
          nome,
          telefone: telefoneLimpo,
          cpf: cpfLimpo,
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

    if (!perfilId) {
      setErro("Erro ao identificar usuário")
      setSalvando(false)
      return
    }

    let fotoUrl: string | null = null

    try {
      fotoUrl = await uploadFoto(perfilId)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao enviar foto.")
      setSalvando(false)
      return
    }

    const userPayload = {
      nome,
      telefone: telefoneLimpo,
      cpf: cpfLimpo,
      data_nascimento: dataNascimento || null,
      ...(fotoUrl ? { foto: fotoUrl } : {}),
    }

    const { error: userUpdateError } = await supabase
      .from("user")
      .update(userPayload)
      .eq("id", perfilId)

    if (userUpdateError) {
      setErro(userUpdateError.message)
      setSalvando(false)
      return
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

    if (fotoUrl) {
      setFotoPreview(fotoUrl)
      setFotoFile(null)
      setFotoNome("")
    }

    setMensagem("Perfil salvo com sucesso!")
    setSalvando(false)

    router.push("/perfil")
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push("/login")
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  if (loading) {
    return <div className="py-10 text-center">Carregando...</div>
  }

  return (
    <section className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl border p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">Meu perfil</h1>

        <form onSubmit={salvarPerfil} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="relative h-28 w-28 overflow-hidden rounded-full border bg-muted transition hover:opacity-80"
            >
              {fotoPreview ? (
                <Image
                  src={fotoPreview}
                  alt="Foto do usuário"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  Foto
                </div>
              )}
            </button>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />

            {fotoNome && (
              <p className="max-w-xs truncate text-sm text-muted-foreground">
                {fotoNome}
              </p>
            )}
          </div>

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
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              placeholder="CPF"
              className="h-11 rounded-xl border px-3"
            />

            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="h-11 rounded-xl border px-3 md:col-span-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <input
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                onBlur={() => {
                  if (limparNumeros(cep).length === 8) {
                    buscarEnderecoPorCep(cep)
                  }
                }}
                placeholder="CEP"
                maxLength={9}
                className="h-11 rounded-xl border px-3"
              />

              {buscandoCep && (
                <p className="text-xs text-muted-foreground">
                  Buscando endereço pelo CEP...
                </p>
              )}

              {erroCep && <p className="text-xs text-red-500">{erroCep}</p>}
            </div>

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
              onChange={(e) => {
                setCidadeId(e.target.value)
                setErroCep(null)
              }}
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