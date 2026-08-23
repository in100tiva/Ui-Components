import { FUNDOS, usarFundo } from "../../lib";
import { Bancada } from "../pecas";

/**
 * A página de fundos: cada cartão mostra o fundo de verdade em miniatura, e o
 * mesmo cartão liga e desliga.
 */
export function DemoDosFundos() {
  const { fundo, alternar } = usarFundo();

  return (
    <Bancada
      titulo="Fundo do conteúdo"
      apoio="Marque um fundo e ele entra DENTRO do cartão de conteúdo, atrás do que se lê — a moldura ao redor e a coluna continuam lisas. O texto ganha uma superfície de vidro por cima: medindo, dá para ver que sem ela não existe opacidade que sirva. Clicar de novo no que está marcado desliga; a escolha fica guardada entre visitas."
      saida={[{ rotulo: "Fundo", valor: fundo ?? "nenhum" }]}
    >
      <div className="demo-fundos">
        {FUNDOS.map((f) => {
          const ligado = fundo === f.id;
          return (
            <div key={f.id} className="demo-fundo" data-ligado={ligado ? "true" : undefined}>
              {/*
                A amostra é o COMPONENTE de verdade, não uma imagem: o que se
                escolhe é exatamente o que se vê, e um ajuste no fundo aparece
                aqui no mesmo instante — sem captura para regravar.
              */}
              <div className="demo-fundo__amostra">
                <f.Desenho className="cui-fundo-amostra" />
              </div>

              <div className="demo-fundo__texto">
                <strong className="demo-fundo__nome">{f.nome}</strong>
                <span className="demo-fundo__descricao">{f.descricao}</span>
              </div>

              {/*
                `aria-pressed` e não um `checkbox`: isto não é um campo de
                formulário que será enviado, é um interruptor que age na hora. O
                leitor de tela anuncia "pressionado", que é exatamente o estado.
              */}
              <button
                type="button"
                className="demo-fundo__botao"
                aria-pressed={ligado}
                onClick={() => alternar(f.id)}
              >
                {ligado ? "Em uso — clique para tirar" : "Usar neste site"}
              </button>
            </div>
          );
        })}
      </div>
    </Bancada>
  );
}
