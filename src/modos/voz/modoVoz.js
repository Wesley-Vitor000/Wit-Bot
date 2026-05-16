const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { downloadMediaMessage } = require('@whiskeysockets/baileys')

const filtros = {
  grave: 'asetrate=48000*0.75,aresample=48000,atempo=1.25',
  fina: 'asetrate=48000*1.35,aresample=48000,atempo=0.90',
  eco: 'aecho=0.8:0.9:700:0.3',
  rapida: 'atempo=1.5',
  lenta: 'atempo=0.75'
}

function alterarVoz(caminhoEntrada, caminhoSaida, filtro) {
  return new Promise((resolve, reject) => {
    const comando = `ffmpeg -y -i "${caminhoEntrada}" -filter:a "${filtro}" -c:a libopus "${caminhoSaida}"`
    
    exec(comando, (erro) => {
      if (erro) {
        reject(erro)
        return
      }
      
      resolve()
    })
  })
}

async function modoVoz(sock, remoteJid, nome, text, modoUsuarios, message) {
  const textoNormalizado = text.toLowerCase().trim()
  
  if (textoNormalizado === '4') {
    modoUsuarios[remoteJid] = {
      modo: 'voz',
      efeito: null
    }
    
    await sock.sendMessage(remoteJid, {
      text: msg.voz(nome)
    })
    
    return
  }
  
  if (modoUsuarios[remoteJid]?.modo === 'voz' && !modoUsuarios[remoteJid].efeito) {
    const opcoes = {
      '1': 'grave',
      '2': 'fina',
      '3': 'eco',
      '4': 'rapida',
      '5': 'lenta'
    }
    
    const efeitoEscolhido = opcoes[textoNormalizado]
    
    if (!efeitoEscolhido) {
      await sock.sendMessage(remoteJid, {
        text: `Escolha uma opção válida:\n\n1 - Grave\n2 - Fina\n3 - Eco\n4 - Rápida\n5 - Lenta`
      })
      return
    }
    
    modoUsuarios[remoteJid].efeito = efeitoEscolhido
    
    await sock.sendMessage(remoteJid, {
      text: `Perfeito, ${nome}! 🎙️\n\nAgora me envie um áudio que eu vou aplicar o efeito: *${efeitoEscolhido}*.`
    })
    
    return
  }
  
  const temAudio = message.message?.audioMessage
  
  if (!temAudio) {
    await sock.sendMessage(remoteJid, {
      text: `Me manda um áudio, ${nome}, que eu altero a voz pra você 🎙️`
    })
    return
  }
  
  try {
    const efeitoEscolhido = modoUsuarios[remoteJid]?.efeito || 'grave'
    const filtro = filtros[efeitoEscolhido]
    
    const pastaRecebidos = path.join(__dirname, 'audios-recebidos')
    const pastaProntos = path.join(__dirname, 'audios-prontos')
    
    fs.mkdirSync(pastaRecebidos, { recursive: true })
    fs.mkdirSync(pastaProntos, { recursive: true })
    
    const nomeArquivo = Date.now()
    
    const caminhoEntrada = path.join(pastaRecebidos, `${nomeArquivo}.ogg`)
    const caminhoSaida = path.join(pastaProntos, `${nomeArquivo}-${efeitoEscolhido}.ogg`)
    
    const buffer = await downloadMediaMessage(message, 'buffer', {}, {
      logger: console,
      reuploadRequest: sock.updateMediaMessage
    })
    
    fs.writeFileSync(caminhoEntrada, buffer)
    
    await alterarVoz(caminhoEntrada, caminhoSaida, filtro)
    
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