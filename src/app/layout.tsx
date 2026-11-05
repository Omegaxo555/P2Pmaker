import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'P2P Flow AI | Asistente de Arbitraje Binance P2P (USDT/VES)',
  description: 'Motor analítico inteligente y optimizador de márgenes P2P con gráficos y memoria de grafo Neo4j',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-surface-900 text-slate-100 antialiased selection:bg-brand selection:text-surface-900">
        {children}
      </body>
    </html>
  );
}

