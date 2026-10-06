# RastroCoffee — Netlify + Supabase

Protótipo acadêmico para rastrear lotes de café, registrar etapas pelos produtores e verificar dados e laudos PDF com SHA-256 e Solana Devnet.

## O que esta versão inclui

- Next.js com React, TypeScript e Tailwind; `next build --webpack` gera `.next`.
- Login por e-mail e senha com Supabase Auth. A identidade é conferida no servidor pelo endpoint Auth `/user`. Sessão em cookies HttpOnly, Secure em produção, SameSite=Lax, com renovação no proxy.
- Administradora identificada por `ADMIN_EMAIL` e e-mail confirmado no Supabase; produtores vinculados por e-mail no painel.
- PostgreSQL com registros JSONB e Storage com bucket privado para os PDFs originais.
- Cadastro de produtor, propriedade, lote; seis botões rápidos para registrar etapas.
- Ficha sensorial editável por administradora/produtor: pontuação, notas, variedade, processo, altitude e referência ao laudo.
- Versões imutáveis, SHA-256, assinatura Phantom na Devnet e publicação explícita com QR Code.
- Até três PDFs por lote, de até 4 MB cada. Cada hash entra no snapshot e em um Memo da mesma transação Solana. O limite menor considera o transporte binário pelas funções Netlify.

Esta versão não usa Vinext, Cloudflare D1/R2, plugins Sites ou login ChatGPT. A chave privilegiada do Supabase fica somente no servidor; os clientes não têm acesso direto à tabela ou ao bucket. As rotas verificam o perfil e o escopo de cada produtor antes de usar a chave. A consulta pública só disponibiliza versões publicadas e documentos referenciados nelas. Versões em rascunho têm prévia somente para a administradora proprietária.

## 1. Configurar o Supabase

1. Crie um projeto Supabase novo para o RastroCoffee.
2. Abra **SQL Editor** e execute todo o arquivo `supabase/schema.sql`. Ele cria a tabela, os índices, a proteção de versões/documentos e o bucket privado `laudos`. Aplique em um projeto novo; este SQL não migra bancos de outras aplicações.
3. Em **Authentication → Users**, crie sua conta com o e-mail que será definido em `ADMIN_EMAIL`, uma senha e e-mail confirmado (Auto Confirm na criação pelo painel, quando disponível).
4. Mantenha o provedor Email habilitado. Esta versão não oferece cadastro público, convite por e-mail ou recuperação automática de senha. Desabilite novos cadastros públicos se não precisar deles. O gerenciamento inicial de contas é feito pelo painel Supabase.
5. Copie a URL do projeto e suas chaves nas configurações do Supabase. Use a chave anon/publishable para `SUPABASE_ANON_KEY`; a chave service_role/secret para `SUPABASE_SERVICE_ROLE_KEY`. Ambas ficam no servidor; a segunda nunca deve ser publicada em Git ou receber o prefixo `NEXT_PUBLIC_`.
6. O bucket `laudos` deve continuar privado, sem políticas de leitura/escrita para anon/authenticated. Se mudar seu nome, ajuste o SQL e `SUPABASE_STORAGE_BUCKET`.

## 2. Rodar no computador

Pré-requisitos: Node.js 22.13 ou superior e pnpm indicado no `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
```

Copie `.env.example` para `.env.local` e preencha os valores reais:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_OU_PUBLISHABLE
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_OU_SECRET
ADMIN_EMAIL=admin@exemplo.com
SUPABASE_STORAGE_BUCKET=laudos
```

```sh
pnpm dev
```

Abra `http://localhost:3000/login`. Para compilar e conferir:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm test:integration` exige o build pronto e inicia um servidor Next.js de produção contra um simulador local de Supabase. Ele verifica login, renovação da sessão, proteção de origem, isolamento/revogação do produtor, PDFs e consulta pública sem criar dados externos. Não substitui o teste de integração com seu projeto Supabase real ou a transação real com Phantom.

## 3. Publicar no Netlify

1. Substitua o conteúdo antigo do repositório pelo conteúdo **dentro** da pasta `RastroCoffee-Netlify` deste ZIP. Remova `vite.config.ts`, `build/`, `.openai/` e os scripts antigos se ainda estiverem no repositório. Não mescle os dois projetos.
2. Envie o novo código ao Git e conecte o repositório ao Netlify. A pasta base deve ser a que contém `package.json` e `netlify.toml`; se manteve uma subpasta, configure essa subpasta como Base directory.
3. Em **Environment variables**, configure as cinco variáveis acima para o ambiente Production e para execução das Functions. Também configure para Deploy Previews se for usar prévias. Nenhuma credencial está incluída no ZIP.
4. Use **Build command:** `pnpm run build`; **Publish directory:** `.next`; Node 22. O `netlify.toml` já define esses valores. Deixe o Netlify detectar Next.js e aplicar seu adaptador; não configure este projeto como Vite nem exportação estática.
5. Faça um novo deploy. Se houver cache da versão antiga, use **Clear cache and deploy site**.
6. Entre em `/login` com a conta criada no Supabase. A compilação pode funcionar sem credenciais; o sistema precisa delas em execução.

Não basta arrastar este ZIP para o deploy manual estático do Netlify: o projeto tem APIs e precisa do processo de build/adaptação do Next.js por repositório ou CLI.

## 4. Liberar o produtor

1. Entre como administradora e cadastre produtor e propriedade.
2. No menu **Acessos do produtor**, vincule o e-mail ao produtor correto.
3. Crie também a conta do mesmo e-mail em **Supabase → Authentication → Users**, com senha e e-mail confirmado.
4. Envie ao produtor o endereço `/login` e combine a entrega da senha por um canal adequado. O formulário de vínculo não cria conta nem envia convite.
5. O produtor entra, cria seus lotes e registra as etapas. Apenas a administradora gera versões e registra na blockchain. Revogar o vínculo bloqueia as chamadas seguintes do produtor.

## 5. Conferir a Solana

Use uma carteira Phantom exclusivamente para desenvolvimento e SOL de teste na **Devnet**. A carteira assina no navegador; nenhuma chave privada é enviada ao servidor. Preencha e revise a ficha do café; gere a versão, registre pela Phantom e confira a prévia privada. Depois clique em **Publicar para o consumidor** para liberar a página e seu QR Code. Gerar uma versão ou confirmar uma transação não publica automaticamente. **Retirar publicação** bloqueia a página e os PDFs; a transação na blockchain continua existindo.

O servidor consulta a transação confirmada, confere os Memos da versão e de cada PDF, a carteira signatária e a ausência de erros. Recalcula o snapshot e os bytes dos PDFs. Alteração gera divergência; arquivo ou rede indisponível impede exibir verificação concluída. A blockchain comprova a correspondência com o registro, não a veracidade do que foi declarado pelo produtor. Devnet é uma rede de teste e pode não preservar o histórico indefinidamente.

## Ficha, publicação e controle de requisições

- Em bancos que já executaram o schema anterior, aplique `supabase/migrations/20261006135220_coffee_profiles_publications.sql`. Não publica versões existentes automaticamente. Links antigos exigem publicação explícita; nada é apagado da blockchain.
- O campo de pontuação exige um laudo do próprio lote. A ficha é preenchida e revisada manualmente a partir do documento; este MVP não extrai PDFs automaticamente nem certifica a nota. Confira o identificador do lote no laudo.
- A pontuação e as notas ficam dentro do snapshot e do hash da nova versão (formato 3). Alterar a ficha de trabalho não altera versões já geradas. Versões antigas de formato 2 continuam verificáveis.
- As tabelas `records`, `coffee_profiles` e `publications` e o bucket privado não permitem leitura/gravação direta de anon/authenticated. As rotas do servidor validam papel e propriedade antes de usar a chave administrativa.
- Os arquivos `netlify/edge-functions/*-limit.ts` definem limites por IP e domínio a cada 60 segundos: login 10 e todas as APIs 30 (consultas e gravações). São duas regras com um padrão de caminho cada, respeitando o limite do plano Free. São regras da plataforma, aplicadas após o deploy Netlify (não no servidor Next local). Podem levar até 10 segundos para bloquear excedentes com HTTP 429. Pessoas na mesma rede compartilham o limite; isso não é um teto global contra tráfego distribuído. Confira a seção Rate limiting do deploy para confirmar que as duas regras foram aplicadas.
- Uma publicação exige versão confirmada, hash correspondente, PDFs íntegros e Memos válidos na Devnet. A decisão final é da administradora; produtores continuam criando apenas lotes próprios, etapas e fichas.

## Dados e limites

- Dados, contas e PDFs do site anterior não foram transferidos: este pacote é o código. UUIDs dos usuários no Supabase são diferentes dos identificadores do login anterior. Uma migração de dados exige mapear os proprietários e copiar os arquivos separadamente.
- A ficha do café pode ser editada; a mudança só entra na consulta pública após gerar, registrar e publicar uma nova versão. Os demais cadastros não possuem edição/exclusão. Um PDF novo exige uma nova versão para ser incluído na blockchain; versões anteriores permanecem intactas.
- Recuperação de senha e convites não têm fluxo no app; use o gerenciamento de contas Supabase. Evite enviar links de convite/recovery antes de implementar seu fluxo de callback no app.
- Teste seu deploy real com a administradora, dois produtores, um laudo e uma transação Phantom antes da apresentação. Testes locais usam um simulador HTTP para Supabase; o SQL precisa ser aplicado e conferido no projeto real.
- Não configure cache público para `/`, `/produtor`, `/api/*` nem rotas de login. As respostas passam pelo proxy com `Cache-Control: private, no-store`.

## Referências técnicas

- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/build/functions/configuration/
- https://github.com/supabase/auth/blob/master/openapi.yaml
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
