import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Galeria } from "./demo/Galeria";
import "./estilos/base.css";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Elemento #raiz não encontrado no index.html");

/*
  A transição de cores é ligada DEPOIS da primeira pintura. Ligada de saída, ela
  animaria a tela inteira do branco padrão até o tema aplicado — que é exatamente
  o flash que o script inline do `index.html` existe para evitar.
*/
requestAnimationFrame(() => {
  document.documentElement.setAttribute("data-tema-transicao", "");
});

createRoot(raiz).render(
  <StrictMode>
    <Galeria />
  </StrictMode>,
);
