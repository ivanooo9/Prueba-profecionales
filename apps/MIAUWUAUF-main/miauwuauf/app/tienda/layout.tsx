import { CartSidebar } from "./components/CartSidebar"

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <CartSidebar />
    </>
  )
}
