(() => {
  const oldParagraphs = [
    /^(?:Este bilhete é uma sugestão de texto|Texto de exemplo: personalize|\[Conte aqui o que você lembra|\[Escreva aqui como a conversa começou|\[Esta é uma sugestão de abertura)/i
  ];
  window.cleanDiaryText = value => typeof value === 'string'
    ? value.split(/\r?\n/).filter(line => !oldParagraphs.some(pattern => pattern.test(line.trim()))).join('\n').trim()
    : value;
})();