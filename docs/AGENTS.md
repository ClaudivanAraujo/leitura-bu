Contexto: preciso de um PWA (HTML + TypeScript + Vite, sem frameworks pesados)
para equipes em campo lerem os QR Codes do Boletim de Urna (BU) das eleições
brasileiras e gerarem um arquivo JSON para eu importar no meu software.
A especificação oficial do TSE está em docs/manual-bu.md. Siga-a à risca.

Requisitos:
1. Ler QR Codes pela câmera traseira do celular (Chrome Android). Usar a API
   BarcodeDetector quando existir e, como alternativa, uma biblioteca (zxing-wasm
   ou similar). Os QR Codes são impressos em papel térmico, pequenos e densos
   (até 1.100 caracteres alfanuméricos), então priorize resolução alta da
   câmera, foco contínuo e botão de lanterna.
2. Existem dois tipos de QR: de dados (começa com QRBU:n:x) e de certificado
   (começa com QRCE:n:x). Ler os dois tipos, em qualquer ordem, ignorar
   duplicados e mostrar progresso (ex.: "Dados 3 de 9 | Certificado 1 de 2"),
   indicando quais faltam. Bloquear o envio até estar tudo completo.
3. Ordenar pelo índice e remontar o conteúdo conforme a seção 1.4 e 1.6.1 do
   manual (hash cumulativo SHA-512 em hexadecimal; atenção ao espaço removido
   na emenda entre QR Codes e ao formato "[dados] HASH:xxx" do conteúdo).
4. Validar o hash cumulativo de cada QR com crypto.subtle. Como o manual deixa
   em aberto detalhes dos separadores, implemente a validação de forma isolada
   e testável, e me avise se os exemplos do manual não baterem.
5. Interpretar o conteúdo (parser sequencial sensível ao contexto): cabeçalho
   (UNFE, MUNI, ZONA, SECA, AGRE, TURN, FASE, etc.), eleições (IDEL), cargos
   (CARG/TIPO), partidos (PART/LEGP/TOTP), votos "número:votos" e o resumo do
   cargo (APTA, APTS, APTT, NOMI, LEGC, BRAN, NULO, TOTC). Cuidado: APTS e APTT
   aparecem no cabeçalho e no resumo de cada cargo.
6. NÃO implementar a verificação da assinatura Ed521 no app. Apenas guardar
   HASH, ASSI e os campos CERT.
7. Gerar um arquivo .json com: versão do app, data/hora da leitura, cabeçalho
   interpretado, cargos/votos interpretados, status do hash e TODOS os textos
   brutos dos QR Codes (dados e certificado). Nome do arquivo:
   BU_<UF>_<MUNI>_<ZONA>_<SECA>_T<turno>.json
8. Botão "Enviar": usar navigator.share com o arquivo (navigator.canShare).
   Se não houver suporte, baixar o arquivo.
9. Funcionar como PWA instalável (manifest + service worker).
10. Escrever testes (Vitest) para parser, ordenação, detecção de QR faltando e
    hash, usando fixtures em tests/fixtures. Se os exemplos do manual não
    puderem ser usados por causa de espaços inseridos na cópia do PDF, diga isso
    em vez de ajustar os dados para o teste passar.

Entregue em etapas: primeiro parser + hash + testes, depois a tela da câmera,
depois o compartilhamento. Pare ao fim de cada etapa para eu validar.