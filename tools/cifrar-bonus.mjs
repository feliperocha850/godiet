// Uso: node tools/cifrar-bonus.mjs <pasta-com-os-PDFs> <arquivo-da-chave>
// Gera public/bonus/<nome>.bin (AES-GCM). A chave fica fora do repositório e vai para o banco (tabela bonus_chave).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { webcrypto, randomBytes } from 'node:crypto';

const [pasta, arquivoChave] = process.argv.slice(2);
const nomes = { manual: 'manual.pdf', suplementos: 'suplementos.pdf', excecoes: 'excecoes.pdf', airfryer: 'airfryer.pdf' };
const chaveHex = existsSync(arquivoChave) ? readFileSync(arquivoChave, 'utf8').trim() : randomBytes(32).toString('hex');
writeFileSync(arquivoChave, chaveHex + '\n', { mode: 0o600 });
const chave = await webcrypto.subtle.importKey('raw', Buffer.from(chaveHex, 'hex'), 'AES-GCM', false, ['encrypt']);
mkdirSync('public/bonus', { recursive: true });
for (const [id, pdf] of Object.entries(nomes)) {
  const caminho = `${pasta}/${pdf}`;
  if (!existsSync(caminho)) { console.log('pulado (sem arquivo):', pdf); continue; }
  const iv = randomBytes(12);
  const cifrado = Buffer.from(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, readFileSync(caminho)));
  writeFileSync(`public/bonus/${id}.bin`, Buffer.concat([iv, cifrado]));
  console.log('ok', id);
}
