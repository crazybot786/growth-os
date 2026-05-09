export default function Home() {
  // Route group (app) contém o shell. Página raiz só redireciona.
  // Usar redirect server-side evita piscar UI e mantém operação rápida.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { redirect } = require('next/navigation');
  redirect('/dashboard');
}
