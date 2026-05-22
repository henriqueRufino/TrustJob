import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";


export const metadata: Metadata = {
  title: "TrustJob",
  description: "Trabalho de conclusão de curso - Henrique & Felipe",
  openGraph: {
    title: "TrustJob",
    description: "Encontre prestadores confiáveis na sua região",
    images: ["/tcc_logo_footer.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <Navbar />

        <main className="flex min-h-[calc(100vh-4rem)] flex-col">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
