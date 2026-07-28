const express = require('express');
const fs = require('fs');
const path = require('path');
const { TspdNFCe } = require('componente-nfce-sdk');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Instancia e configura o componente
function criarNFCe() {
  const nfce = new TspdNFCe();
  nfce.loadConfig({
    uf: 'PR',
    versaoManual: 'vm60',
    ambiente: 'HOMOLOGACAO',
    cnpj: '29062609000177',
    idTokenCSC: '000001',
    tokenCSC: '619UV3RDHYKYS96D40F726ERYNH2XGZSWGBJ',
    caminhoCertificado: path.join(__dirname, 'certificado.pfx'),
    senhaCertificado: '50e48c80-3216-4b30-9b1f-db7578b55483',
    nomeImpressora: 'PDF',
    diretorioImpressao: path.join(__dirname, 'Impressao'),
    diretorioXmlDestinatario: path.join(__dirname, 'XmlDestinatario'),
  });
  return nfce;
}

// Helper para resposta de erro
function erro(res, message) {
  res.status(500).json({ sucesso: false, retorno: message });
}

// ─── ROTAS ────────────────────────────────────────────────────────────────────

// Load Config
app.post('/api/loadConfig', async (req, res) => {
  try {
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    res.json({ sucesso: true, retorno: 'Configurações carregadas com sucesso!' });
  } catch (e) {
    erro(res, e.message);
  }
});

// Get Config
app.get('/api/getConfig', async (req, res) => {
  try {
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const config = await nfce.getConfig();
    res.json({ sucesso: true, retorno: JSON.stringify(config, null, 2) });
  } catch (e) {
    erro(res, e.message);
  }
});

// Status Serviço
app.get('/api/status', async (req, res) => {
  try {
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.statusServico();
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// Gerar XML via TX2
app.post('/api/gerar-xml', async (req, res) => {
  try {
    const { versaoEsquema } = req.body;
    const tx2 = fs.readFileSync(path.join(__dirname, 'nfce.tx2'), 'utf-8');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const xml = await nfce.converterLoteParaXml(tx2, versaoEsquema || 'pl_010b');
    fs.writeFileSync(path.join(__dirname, 'nota.xml'), xml);
    res.json({ sucesso: true, retorno: xml });
  } catch (e) {
    erro(res, e.message);
  }
});

// Assinar Nota
app.post('/api/assinar', async (req, res) => {
  try {
    const xml = fs.readFileSync(path.join(__dirname, 'nota.xml'), 'utf-8');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const xmlAssinado = await nfce.assinarNota(xml);
    fs.writeFileSync(path.join(__dirname, 'nota-assinada.xml'), xmlAssinado);
    res.json({ sucesso: true, retorno: xmlAssinado });
  } catch (e) {
    erro(res, e.message);
  }
});

// Enviar Nota
app.post('/api/enviar', async (req, res) => {
  try {
    const xmlAssinado = fs.readFileSync(path.join(__dirname, 'nota-assinada.xml'), 'utf-8');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.enviarNota('0001', xmlAssinado);
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// Consultar Nota
app.post('/api/consultar', async (req, res) => {
  try {
    const { chaveNota } = req.body;
    if (!chaveNota) return erro(res, 'Chave da nota não informada.');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.consultar(chaveNota);
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// Cancelar Nota
app.post('/api/cancelar', async (req, res) => {
  try {
    const { chaveNota, protocolo, justificativa, dataHoraEvento, fusoHorario } = req.body;
    if (!chaveNota || !protocolo) return erro(res, 'Chave e protocolo são obrigatórios.');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.cancelar(
      chaveNota,
      protocolo,
      justificativa || 'Cancelamento de nota fiscal',
      dataHoraEvento || new Date().toISOString().slice(0, 19),
      '1',
      fusoHorario || '-03:00',
      '0001'
    );
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// Inutilizar
app.post('/api/inutilizar', async (req, res) => {
  try {
    const { ano, serie, numeroInicial, numeroFinal, justificativa } = req.body;
    if (!ano || !serie || !numeroInicial || !numeroFinal) return erro(res, 'Preencha todos os campos obrigatórios.');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.inutilizar(
      ano,
      '29062609000177',
      '65',
      serie,
      numeroInicial,
      numeroFinal,
      justificativa || 'Inutilização de numeração não utilizada'
    );
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// Imprimir
app.post('/api/imprimir', async (req, res) => {
  try {
    const { chaveNota } = req.body;
    if (!chaveNota) return erro(res, 'Chave da nota não informada.');
    const nfce = criarNFCe();
    await nfce.configurarSoftwareHouse('29062609000177', '59832bc18958722cac0ebb9b30944878');
    const retorno = await nfce.imprimir(chaveNota);
    res.json({ sucesso: true, retorno });
  } catch (e) {
    erro(res, e.message);
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
