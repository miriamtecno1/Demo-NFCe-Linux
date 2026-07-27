const { TspdNFCe } = require('componente-nfce-sdk');
const fs = require('fs');

const nfce = new TspdNFCe();

function configurar() {
  nfce.loadConfig({
    uf: 'PR',
    versaoManual: 'vm60',
    ambiente: 'HOMOLOGACAO',
    cnpj: '29062609000177',
    idTokenCSC: '000001',
    tokenCSC: '619UV3RDHYKYS96D40F726ERYNH2XGZSWGBJ',
    caminhoCertificado: `${__dirname}/certificado.pfx`,
    senhaCertificado: '50e48c80-3216-4b30-9b1f-db7578b55483',
    nomeImpressora: 'PDF',
    diretorioImpressao: `${__dirname}/Impressao`,
    diretorioXmlDestinatario: `${__dirname}/XmlDestinatario`,
  });
}

async function main() {
  const passo = process.argv[2];

  configurar();
  await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
  console.log('Componente configurado com sucesso!');

  if (passo === 'loadConfig') {
    configurar();
    console.log('Configurações carregadas com sucesso!');

  } else if (passo === 'getConfig') {
    const getConfig = await nfce.getConfig();
    console.log('Get Config:', getConfig);

  } else if (passo === 'status') {
    const status = await nfce.statusServico();
    console.log('Status do serviço:', status);

  } else if (passo === 'gerar-xml') {
    const tx2 = fs.readFileSync(`${__dirname}/nfce.tx2`, 'utf-8');
    const xml = await nfce.converterLoteParaXml(tx2, 'pl_010b');
    fs.writeFileSync(`${__dirname}/nota.xml`, xml);
    console.log('XML gerado e salvo em nota.xml!');

  } else if (passo === 'assinar') {
    const xml = fs.readFileSync(`${__dirname}/nota.xml`, 'utf-8');
    const xmlAssinado = await nfce.assinarNota(xml);
    fs.writeFileSync(`${__dirname}/nota-assinada.xml`, xmlAssinado);
    console.log('XML assinado e salvo em nota-assinada.xml!');

  } else if (passo === 'enviar') {
    const xmlAssinado = fs.readFileSync(`${__dirname}/nota-assinada.xml`, 'utf-8');
    const retorno = await nfce.enviarNota('0001', xmlAssinado);
    console.log('Retorno do envio:', retorno);

  } else if (passo === 'inutilizar') {
    const retorno = await nfce.inutilizar(
      '26', //ano
      '29062609000177', //cnpj
      '65', //modeloo
      '001', //serie
      '900', //num inicial
      '900',//num final

      'Inutilização de numeração não utilizada'
    );
    console.log('Retorno da inutilização:', retorno);

  } else if (passo === 'consultar') {
    const chaveNota = process.argv[3];
    if (!chaveNota) {
      console.log('Informe a chave da nota. Exemplo:');
      console.log('node index.js consultar 41260614078130001756509900000118751000871246');
      return;
    }
    const retorno = await nfce.consultar(chaveNota);
    console.log('Retorno da consulta:', retorno);

  } else if (passo === 'cancelar') {
    const chaveNota = process.argv[3];
    const protocolo = process.argv[4];
    if (!chaveNota || !protocolo) {
      console.log('Informe a chave e o protocolo da nota. Exemplo:');
      console.log('node index.js cancelar <chave44digitos> <protocolo15digitos>');
      return;
    }
    const retorno = await nfce.cancelar(
      chaveNota,
      protocolo,
      'Cancelamento de nota fiscal emitida em homologacao',
      new Date().toISOString().slice(0, 19),
      '1',
      '-03:00',
      '0001'
    );
    console.log('Retorno do cancelamento:', retorno);

   } else if (passo === 'imprimir') {
    const chaveNota = process.argv[3];
    if (!chaveNota) {
      console.log('Informe a chave da nota. Exemplo:');
      console.log('node index.js imprimir 41260429062609000177650600000000671000000220');
      return;
    }
    
    console.log('Tentando imprimir com chave:', chaveNota);
    const retorno = await nfce.imprimir(chaveNota);
    console.log('Retorno da impressão:', retorno);

  } else {
    console.log(`
Uso: node index.js <passo>

Passos disponíveis:
  loadConfig                    Carrega as configurações do componente
  getConfig                     Busca as configurações do componente
  status                        Verifica o status do serviço SEFAZ
  gerar-xml                     Converte o TX2 para XML
  assinar                       Assina o XML gerado
  enviar                        Envia a nota assinada para a SEFAZ
  inutilizar                    Inutiliza uma faixa de numeração
  consultar <chave>             Consulta uma nota pela chave de 44 dígitos
  cancelar  <chave> <protocolo> Cancela uma nota autorizada
  imprimir  <chave>             Imprime o DANFCe na impressora configurada
    `);
  }
}

main().catch(console.error);