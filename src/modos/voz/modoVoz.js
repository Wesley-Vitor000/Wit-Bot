// modo voz grave bot wit

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { downloadMediaMessage } = require('@whiskeysockets/baileys')

// Essa função altera o áudio usando o FFmpeg
// Aqui estamos criando o efeito de voz grave
function converterVozGrave(caminhoEntrada, caminhoSaida) {
  return new Promise((resolve, reject) => {
    const comando = `ffmpeg -y -i "${caminhoEntrada}" -filter:a "asetrate=48000*0.75,aresample=48000,atempo=1.25" -c:a libopus "${caminhoSaida}"`
    
    exec(comando, (erro) => {
      if (erro) {
        reject(erro)
        return
      }
      
      resolve()
    })
  })
}

// Função principal do modo voz
async function modoVoz(sock, remoteJid, nome, text, modoUsuarios, message) {
  const textoNormalizado = text.toLowerCase().trim()
  
  if (textoNormalizado === '4') {
    modoUsuarios[remoteJid] = 'vozgrave'
    
    await sock.sendMessage(remoteJid, {
      text: `Você escolheu o Modo Voz Grave, ${nome}! 🎙️\n\nAgora me envie um áudio e eu vou devolver ele com a voz mais grave 😎`
    })
    
    return
  }
  
  const temAudio = message.message?.audioMessage
  
  if (!temAudio) {
    await sock.sendMessage(remoteJid, {
      text: `Me manda um áudio, ${nome}, que eu transformo ele em voz grave 🎙️`
    })
    
    return
  }
  
  try {
    const pastaRecebidos = path.join(__dirname, 'audios-recebidos')
    const pastaProntos = path.join(__dirname, 'audios-prontos')
    
    fs.mkdirSync(pastaRecebidos, { recursive: true })
    fs.mkdirSync(pastaProntos, { recursive: true })
    
    const nomeArquivo = Date.now()
    
    const caminhoEntrada = path.join(pastaRecebidos, `${nomeArquivo}.ogg`)
    const caminhoSaida = path.join(pastaProntos, `${nomeArquivo}-grave.ogg`)
    
    const buffer = await downloadMediaMessage(message, 'buffer', {}, {
      logger: console,
      reuploadRequest: sock.updateMediaMessage
    })
    
    fs.writeFileSync(caminhoEntrada, buffer)
    
    await converterVozGrave(caminhoEntrada, caminhoSaida)
    
    await sock.sendMessage(remoteJid, {
      audio: { url: caminhoSaida },
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    })
    
    fs.unlinkSync(caminhoEntrada)
    fs.unlinkSync(caminhoSaida)
    
  } catch (error) {
    console.log('Erro ao alterar voz:', error)
    
    await sock.sendMessage(remoteJid, {
      text: `Poxa, ${nome}, não consegui alterar esse áudio 😕\n\nTente mandar outro áudio.`
    })
  }
}

module.exports = modoVoz