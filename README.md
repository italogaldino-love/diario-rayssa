# Entre linhas, Rayssa.

Um diário afetivo com entradas por data, marcos da história, termômetro de saudade e mural de recados. Projeto estático: não precisa instalar pacotes nem configurar um servidor de aplicação.

## Antes de compartilhar

Abra `index.html` para conhecer o diário e `editor.html` para escrever. As datas de 1º de agosto (quando vocês se conheceram) e 9 de novembro (início das conversas com interesse) já estão preenchidas. Foi considerado o ano de 2026; ajuste no editor se necessário. Os textos contêm sugestões e trechos para você completar. O nível de saudade de 88% é um exemplo: personalize os textos e o valor, depois desative a indicação de exemplos quando estiver pronto.

Este projeto não tem login. No GitHub Pages pessoal, a página e seus arquivos ficam acessíveis pela internet. Um repositório privado não torna esse site privado. Publique nomes, datas e histórias íntimas somente se quiser torná-los públicos. A documentação do GitHub explica a [visibilidade dos sites](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Publicar no GitHub Pages

1. Entre no GitHub e crie um repositório, por exemplo `diario-para-voce`. No plano gratuito pessoal, use um repositório público.
2. Envie **o conteúdo desta pasta** para a raiz do repositório, mantendo `index.html` diretamente na raiz. Inclua também os demais arquivos e a pasta de recursos, se houver. Não envie uma pasta adicional envolvendo tudo.
3. Salve os arquivos na branch `main`.
4. No repositório, abra **Settings → Pages**. Em **Build and deployment**, selecione **Deploy from a branch**; escolha `main` e `/(root)` e clique em **Save**.
5. Aguarde a publicação. A própria tela Pages mostrará o endereço para visitar.

O endereço de um repositório de projeto costuma ser `https://SEU-USUARIO.github.io/diario-para-voce/`. Se escolher outro nome de repositório, ele também muda no endereço. Para conferir a configuração, veja as [instruções oficiais de publicação por branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

O arquivo vazio `.nojekyll` mantém a publicação como arquivos estáticos. Este projeto dispensa um workflow personalizado. As atualizações podem levar alguns minutos; o GitHub informa que a publicação pode levar até dez minutos. Consulte [Criar um site GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Atualizar textos, saudade e avisos

1. Abra `editor.html` no mesmo navegador e endereço em que costuma editar.
2. Altere os dados do diário, escreva páginas, adicione marcos e recados e ajuste o termômetro.
3. Use a opção de prévia para conferir o rascunho.
4. Exporte o arquivo **data.js** e mantenha esse nome.
5. No repositório do GitHub, substitua o `data.js` da raiz pelo arquivo exportado e salve a alteração na `main`.
6. Aguarde o Pages atualizar. Recarregue o diário para conferir a versão que ela verá.

O editor salva rascunhos no armazenamento local do navegador. **Salvar um rascunho ou abrir a prévia não publica nada para ela.** O conteúdo só se torna compartilhado depois de substituir `data.js` no GitHub e concluir a publicação. Outro navegador, computador ou endereço tem seu próprio armazenamento. Limpar os dados do navegador pode apagar o rascunho; exporte uma cópia para guardá-lo.

Qualquer pessoa pode abrir a página do editor e editar a própria cópia local. Isso não permite alterar seu repositório ou o conteúdo publicado. Somente quem tem acesso de escrita ao repositório consegue publicar atualizações.

## Arquivos principais

| Arquivo | Função |
| --- | --- |
| `index.html` | Diário que ela vai acessar |
| `data.js` | Conteúdo compartilhado: textos, datas, avisos e termômetro |
| `editor.html` | Editor para preparar e exportar atualizações |
| `.nojekyll` | Publicação estática no Pages |

## Se algo não aparecer

Confira se `index.html` está na raiz da `main` e se a origem em Pages é `main / (root)`. Na aba **Actions**, abra a execução do Pages para verificar falhas. Depois de uma atualização, tente recarregar a página sem o cache. Mantenha os nomes de arquivo e seus acentos exatamente como foram entregues.

## Tempo apaixonado

O contador já está configurado para **9 de novembro de 2026, às 14h52, horário de Brasília (UTC−03:00)**. Ele mostra anos, meses, dias, horas, minutos e segundos e se atualiza sozinho. Você não precisa editar nem manter a página aberta: ao retornar, o tempo é calculado novamente a partir do mesmo instante. A hora segue o relógio do dispositivo do visitante.

Meses e anos seguem o calendário, sem converter meses em períodos fixos de 30 dias. As horas, os minutos e os segundos totais também são exibidos.

O editor tem uma seção opcional **Tempo apaixonado** para a mensagem, fotos e música. Isso não é necessário para o contador funcionar. É possível adicionar até seis fotos JPEG, PNG ou WebP; o editor reduz o tamanho e inclui as imagens no arquivo data.js exportado. Para música, informe um link Spotify/YouTube ou um arquivo de áudio (.mp3, .ogg ou .wav) local ou HTTPS. Arquivos de áudio locais devem ser enviados ao repositório junto com o site. Áudios têm controles; links abrem o serviço de música. Nada toca automaticamente. Os dados novos são preservados na importação e exportação, inclusive quando o rascunho foi criado na primeira versão do diário.
