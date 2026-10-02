const fs = require('fs');

async function refactorPage() {
  const path = 'c:/Users/Usuario/Desktop/front-back/MIAUWUAUF/miauwuauf/app/tienda/page.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Add the useCart context after the first couple of imports
  content = content.replace('import { useSession, signOut } from "next-auth/react"', 'import { useSession, signOut } from "next-auth/react"\nimport { useCart } from "./context/CartContext"');

  // Replace useState block
  const lines = content.split('\n');
  const cartStateStartIndex = lines.findIndex(l => l.includes('const [cart, setCart] = useState<CartItem[]>([])'));
  const refEndIndex = lines.findIndex(l => l.includes('const fileInputRef = useRef<HTMLInputElement>(null)'));
  
  if (cartStateStartIndex !== -1 && refEndIndex !== -1) {
    lines.splice(cartStateStartIndex, refEndIndex - cartStateStartIndex + 1, '  const { cartCount, addToCart, setIsCartOpen } = useCart()');
    content = lines.join('\n');
  }

  // Remove the addToCart up to fileUpload function
  const addStart = content.indexOf('const addToCart = (product: TiendaProducto)');
  const checkEnd = content.indexOf('setIsUploading(false)\n    }\n  }');
  if (addStart !== -1 && checkEnd !== -1) {
    content = content.substring(0, addStart) + content.substring(checkEnd + 'setIsUploading(false)\n    }\n  }'.length);
  }

  // Remove the UI blocks
  const sheetStart = content.indexOf('<Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>');
  const dialogEnd = content.lastIndexOf('</Dialog>');
  if (sheetStart !== -1 && dialogEnd !== -1) {
    content = content.substring(0, sheetStart) + content.substring(dialogEnd + '</Dialog>'.length);
  }

  // Remove the useEffecs for localStorage checking exactly
  content = content.replace(/\\s*useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[\\s\\S]*?localStorage\\.setItem\\(\"miauwuauf_cart\"[\\s\\S]*?\\]\\)/g, '');

  fs.writeFileSync(path, content, 'utf8');
}

refactorPage();
