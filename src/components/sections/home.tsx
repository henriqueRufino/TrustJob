import { Search } from "lucide-react"

const Home = () => {
  return (
    <section className="flex flex-1 w-full bg-primary-foreground">
      <div className="flex flex-1 w-full items-center justify-center bg-primary-foreground px-4 py-12 md:px-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:gap-24">
          <div className="flex flex-col items-center gap-20 text-center">
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-black md:text-6xl">
              Cadastre seus serviços ou encontre profissionais de confiança
            </h1>

            <p className="max-w-2xl text-sm text-black/85 md:text-base text-justify">
              Busque por categorias, serviços e profissionais perto de você.
            </p>
          </div>

          <form className="flex w-full max-w-4xl flex-col gap-3 rounded-2xl bg-background p-3 shadow-lg md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-input bg-background px-4 py-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="O que você está procurando hoje?"
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex h-14 items-center justify-center rounded-xl bg-chart-1 px-8 text-base font-semibold text-black transition hover:opacity-90 md:min-w-40"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Home