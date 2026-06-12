import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalLadder, LegalVisualBlock, LegalSectionSummary, LegalIconGrid,
} from "./_visuals";
import {
    Flag, FileCheck, ShieldAlert, Gavel, Clock, BookOpen,
    AlertTriangle, EyeOff, UserX, ShieldOff, Slash, Ban,
} from "lucide-react";

export default function Copyright() {
    return (
        <LegalShell
            active="copyright"
            title="Direitos de Autor e Notificações"
            subtitle="O procedimento de notificação, contestação e remoção de Conteúdo alegadamente violador de direitos de autor ou direitos conexos. Em conformidade com o Código do Direito de Autor e dos Direitos Conexos, com o Decreto-Lei n.º 47/2023, de 19 de junho (transposição da Diretiva (UE) 2019/790) e com os artigos 16.º a 23.º do DSA."
            lastUpdated="Junho de 2026"
            eli5="Se um Conteúdo no Lusorae usa obra tua sem autorização, podes pedir a sua remoção através do endereço dedicado. Respondemos em prazo, fundamentamos a decisão e damos ao autor do Conteúdo um direito de contra-notificação. Notificações abusivas têm consequências."
        >
            <LegalKPIs items={[
                { value: "7 dias",   label: "prazo de resposta", sub: "Casos simples, em regra",        icon: Clock },
                { value: "Sempre",   label: "fundamentação",     sub: "Statement of Reasons (DSA 17.º)", icon: FileCheck },
                { value: "Sim",      label: "contra-notificação", sub: "Defesa do utilizador",            icon: Gavel },
                { value: "3 strikes", label: "infrator reincidente", sub: "Política de suspensão",         icon: ShieldAlert },
            ]} />

            <div className="legal-callout">
                <strong>Endereço dedicado</strong>
                Para notificações de infração de direitos de autor:{" "}
                <a href="mailto:copyright@lusorae.pt">copyright@lusorae.pt</a>. Para questões gerais sobre o
                procedimento ou propriedade intelectual da Plataforma:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </div>

            <h2>Quadro jurídico aplicável</h2>
            <p>
                Esta página executa, na nossa Plataforma, o regime de notificação e remoção (<em>notice and
                takedown</em>) resultante da articulação entre:
            </p>
            <ul>
                <li><strong>Código do Direito de Autor e dos Direitos Conexos</strong> (CDADC), incluindo as obras protegidas (arts. 1.º a 8.º), as faculdades patrimoniais e morais do autor (arts. 9.º e seguintes) e o regime das infrações (arts. 195.º e seguintes);</li>
                <li><strong>Decreto-Lei n.º 47/2023, de 19 de junho</strong>, que transpõe para a ordem jurídica interna a Diretiva (UE) 2019/790 (mercado único digital), ao abrigo da Lei de autorização legislativa n.º 11/2023, de 22 de março;</li>
                <li><strong>Regulamento (UE) 2022/2065</strong> (DSA), artigos 16.º (notificação), 17.º (fundamentação), 20.º (recurso interno), 21.º (resolução extrajudicial) e 23.º (notificações manifestamente infundadas).</li>
            </ul>
            <p>
                Para alegações de violação de direitos conexos (intérpretes, produtores fonográficos, organismos de
                radiodifusão), aplica-se o mesmo procedimento, com adaptações próprias dos respetivos titulares.
            </p>

            <h2>Quem pode notificar</h2>
            <p>
                Pode submeter uma notificação fundamentada de infração:
            </p>
            <ul>
                <li>O <strong>titular dos direitos</strong> sobre a obra alegadamente violada;</li>
                <li>Um <strong>representante</strong> legalmente habilitado pelo titular (mandato escrito);</li>
                <li>Uma <strong>entidade de gestão coletiva</strong> com poderes representativos sobre a obra (e.g. SPA, GDA, AUDIOGEST);</li>
                <li>Um <strong>sinalizador de confiança</strong> certificado pelo Coordenador Nacional dos Serviços Digitais (ANACOM), nos termos do artigo 22.º do DSA.</li>
            </ul>

            <h2>O que a notificação deve incluir</h2>
            <LegalSectionSummary>
                Identifica quem és, qual a obra, onde está a infração, e declara sob compromisso de honra que tens razões fundadas para crer que é ilícita.
            </LegalSectionSummary>
            <p>
                Para que possamos avaliar com rigor, e em conformidade com o artigo 16.º, n.º 2, do DSA, a
                notificação deve conter, no mínimo:
            </p>
            <ol>
                <li><strong>Identificação do notificante</strong>, nome completo (ou denominação social), endereço de e-mail de contacto e, quando atue por representação, prova do mandato;</li>
                <li><strong>Identificação da obra protegida</strong>, descrição suficientemente precisa (título, autor, editora/produtor, ano, ISBN/ISWC/ISRC quando aplicável) e ligação para o original quando este esteja publicamente disponível;</li>
                <li><strong>Localização exata do Conteúdo alegadamente infrator</strong> na Plataforma, URL específico de cada publicação, mensagem, perfil ou ficheiro;</li>
                <li><strong>Fundamentação jurídica sumária</strong>, indicando que direitos invoca e em que medida o uso impugnado os excede (incluindo, quando aplicável, a inexistência de qualquer exceção, citação, paródia, uso transformativo legítimo);</li>
                <li><strong>Declaração sob compromisso de honra</strong>, com a frase: &ldquo;<em>Declaro, sob compromisso de honra, que a informação prestada é verdadeira, que sou titular ou represento o titular dos direitos invocados, e que tenho razões fundadas para crer que o Conteúdo identificado infringe esses direitos.</em>&rdquo;;</li>
                <li><strong>Indicação eletrónica de assinatura</strong>, em e-mail enviado a partir do endereço associado ao notificante (equivalente funcional à assinatura, nos termos do artigo 25.º do Regulamento (UE) n.º 910/2014, eIDAS).</li>
            </ol>

            <h2>Procedimento, do recebimento à decisão</h2>
            <LegalVisualBlock eyebrow="Cinco passos" title="O que acontece desde o teu pedido até à decisão final">
                <LegalLadder steps={[
                    { label: "Recebimento e acusação",   desc: "Acusamos receção em 24 horas úteis. Se a notificação for incompleta, indicamos o que falta.", icon: Flag },
                    { label: "Triagem técnica",           desc: "Verificamos que o Conteúdo existe na Plataforma e que a obra invocada é identificável.",     icon: FileCheck },
                    { label: "Apreciação substantiva",    desc: "Equipa de Trust & Safety com formação jurídica avalia o pedido à luz do CDADC e do DSA.",     icon: Gavel },
                    { label: "Decisão fundamentada",      desc: "Aplicamos a medida proporcional e comunicamos a decisão, com Statement of Reasons (art. 17.º DSA), ao notificante e ao autor do Conteúdo.", icon: BookOpen },
                    { label: "Recurso interno",           desc: "Notificante e autor têm acesso a recurso interno gratuito durante 6 meses (art. 20.º DSA).",   icon: ShieldAlert },
                ]}
                caption="Em regra, casos simples são decididos em 7 dias úteis. Casos complexos podem exigir prazo razoavelmente superior, sempre comunicado por escrito ao notificante." />
            </LegalVisualBlock>

            <h2>Contra-notificação pelo autor do Conteúdo</h2>
            <p>
                Sempre que o Conteúdo seja removido ou despromovido por nossa decisão, o autor do Conteúdo é
                notificado com fundamentação e tem direito a apresentar <strong>contra-notificação</strong>{" "}
                fundamentada. A contra-notificação deve incluir:
            </p>
            <ul>
                <li>Identificação do autor do Conteúdo e da decisão impugnada;</li>
                <li>Fundamentação substancial, e.g. titularidade da obra, autorização do titular, aplicação de exceção legal (citação, paródia, uso académico, etc.) nos termos dos artigos 75.º e seguintes do CDADC;</li>
                <li>Quando aplicável, prova documental da licença ou autorização invocada.</li>
            </ul>
            <p>
                Apreciada a contra-notificação por pessoa diferente da que decidiu inicialmente (artigo 20.º, n.º 6,
                do DSA), informamos o notificante original e o autor do Conteúdo da decisão final, com o respetivo
                Statement of Reasons.
            </p>

            <h2>Reposição do Conteúdo</h2>
            <p>
                Quando o resultado do recurso conclua pela ausência de violação, o Conteúdo é reposto e o autor é
                notificado. A reposição é gratuita, imediata e sem perda de métricas ou referências internas
                associadas ao Conteúdo. Quando o resultado mantenha a remoção, dá-se notícia ao notificante e ao
                autor do Conteúdo, com indicação dos meios de resolução extrajudicial (artigo 21.º DSA) e judicial.
            </p>

            <h2>Notificações manifestamente infundadas e abusivas</h2>
            <p>
                Em conformidade com o artigo 23.º do DSA, podemos suspender a possibilidade de submissão de
                notificações por pessoas que, com frequência manifesta, apresentem notificações infundadas, com
                aviso prévio e fundamentado. A submissão dolosa de informação falsa numa notificação é
                criminalmente punível (art. 348.º-A do Código Penal, falsas declarações perante autoridade) e
                pode fundamentar responsabilidade civil pelos danos causados ao autor do Conteúdo cuja publicação
                tenha sido indevidamente retirada.
            </p>

            <h2>Política de infratores reincidentes</h2>
            <p>
                Aplicamos uma política de proporcionalidade calibrada à gravidade e à reincidência:
            </p>

            <LegalIconGrid tone="warn" items={[
                { label: "1.ª ocorrência: aviso interno, com explicação do facto e da regra", ref: "Aviso · DSA 17.º", icon: Flag },
                { label: "2.ª ocorrência: remoção e restrição temporária da capacidade de publicar (7 dias)", ref: "Restrição · DSA 23.º", icon: EyeOff },
                { label: "3.ª ocorrência num período de 12 meses: suspensão temporária da conta (30 dias)", ref: "Suspensão temporária", icon: UserX },
                { label: "Reincidência sistemática ou infração manifestamente grave: suspensão permanente, recorrível", ref: "Suspensão permanente", icon: ShieldOff },
                { label: "Conta criada com finalidade exclusiva de circunvenção de sanção anterior: encerramento imediato", ref: "Anti-evasão", icon: Ban },
                { label: "Reposição em recurso procedente: contagem reinicia", ref: "Restituição justa", icon: Slash },
            ]} />

            <h2>Propriedade intelectual da Plataforma</h2>
            <p>
                A marca &ldquo;Lusorae&rdquo;, o logótipo, a interface, o sistema de desenho e o código-fonte
                proprietário são propriedade do prestador ou estão licenciados ao prestador, ao abrigo do Código da
                Propriedade Industrial e do CDADC. As bibliotecas de código aberto incorporadas no Serviço estão
                disponíveis a pedido em <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>, com a respetiva
                licença e atribuição.
            </p>

            <h2>Resolução extrajudicial e judicial</h2>
            <p>
                Sem prejuízo do recurso interno (art. 20.º DSA) e da resolução extrajudicial certificada (art. 21.º
                DSA), permanecem disponíveis os meios judiciais comuns, incluindo as providências cautelares
                previstas no CDADC, e a competência dos tribunais portugueses nos termos do Regulamento (UE)
                n.º 1215/2012. Para questões transfronteiriças, aplica-se ainda o Regulamento (CE) n.º 593/2008
                (Roma I) e o Regulamento (CE) n.º 864/2007 (Roma II).
            </p>

            <h2>Contactos institucionais</h2>
            <p>
                Notificações de infração:{" "}
                <a href="mailto:copyright@lusorae.pt">copyright@lusorae.pt</a>. Contra-notificações e recursos:{" "}
                <a href="mailto:recurso@lusorae.pt">recurso@lusorae.pt</a>. Questões gerais de propriedade
                intelectual ou licenciamento:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>
        </LegalShell>
    );
}
