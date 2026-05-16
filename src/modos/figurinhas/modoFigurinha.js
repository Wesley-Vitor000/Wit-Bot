const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { exec } = require('child_process') // Serve para executar comandos do terminal a partir do código JavaScript
const { downloadMediaMessage } = require('@whiskeysockets/baileys') // Serve para baixar os arquivos de mídia que os usuários enviam para o bot, como imagens e vídeos, para que o bot possa processar esses arquivos e transformá-los em figurinhas.
const estilo = require('../../utils/mensagensWit')

function converterVideoParaWebp(caminhoVideo, caminhoFigurinha) {
    return new Promise((resolve, reject) => { // Essa função é responsável por converter um vídeo em formato MP4 para o formato WebP, que é o formato de figurinhas do WhatsApp. Ela usa o FFmpeg para fazer a conversão, e retorna uma Promise que resolve quando a conversão é concluída, ou rejeita se ocorrer algum erro durante o processo.
        const comando = `ffmpeg -y -i "${caminhoVideo}" -t 6 -vf "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -loop 0 -an -vsync 0 "${caminhoFigurinha}"`
        exec(comando, (erro) => {
            if (erro) {
                reject(erro)
                return
            }
            
            resolve()
        })
    })
}


// Função para processar as mensagens no Modo Figurinhas
async function modoFigurinha(sock, remoteJid, nome, text, modoUsuarios, message) {
    const textoNormalizado = text.toLowerCase().trim()
    
    if (textoNormalizado === '3') {
        modoUsuarios[remoteJid] = 'figurinha'
        
        await sock.sendMessage(remoteJid, {
            text: estilo.figurinha(nome)
        })
        return
    }
    
    const temImagem = message.message?.imageMessage
    const temVideo = message.message?.videoMessage
    
    if (!temImagem && !temVideo) {
        await sock.sendMessage(remoteJid, {
            text: `Me manda uma imagem ou vídeo curto, ${nome}, que eu transformo em figurinha pra você 😁`
        })
        return
    }
    
    try {
        const buffer = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        }) // Essa linha é responsável por baixar o arquivo de mídia que o usuário enviou para o bot, usando a função downloadMediaMessage da biblioteca Baileys. O arquivo é baixado como um buffer, que é um tipo de objeto em JavaScript que representa uma sequência de bytes. O buffer é necessário para que o bot possa processar o arquivo e convertê-lo em uma figurinha.
        
        const nomeArquivo = Date.now() // Gera um nome de arquivo único usando o timestamp atual
        
        const pastaRecebidas = path.join(__dirname, 'midias-recebidas')
        const pastaProntas = path.join(__dirname, 'figurinhas-prontas')
        
        fs.mkdirSync(pastaRecebidas, { recursive: true })
        fs.mkdirSync(pastaProntas, { recursive: true })
        
        const caminhoFigurinha = path.join(pastaProntas, `${nomeArquivo}.webp`)
        
        
        if (temImagem) {
            const caminhoImagem = path.join(pastaRecebidas, `${nomeArquivo}.jpg`)
            
            fs.writeFileSync(caminhoImagem, buffer) // Salva a imagem recebida na pasta de mídias recebidas
            
            await sharp(caminhoImagem)
                .resize(512, 512, { // Redimensiona a imagem para 512x512 pixels, que é o tamanho ideal para figurinhas do WhatsApp
                    fit: 'cover', // Mantém a proporção original da imagem, redimensionando para caber dentro de um quadrado de 512x512 pixels
                }) // Redimensiona a imagem para caber dentro de um quadrado de 512x512 pixels, mantendo a proporção original
                .webp() // Converte a imagem para o formato WebP, que é o formato de figurinhas do WhatsApp
                .toFile(caminhoFigurinha) // Salva a figurinha pronta na pasta de figurinhas prontas
            
            await sock.sendMessage(remoteJid, {
                sticker: { url: caminhoFigurinha } // Envia a figurinha pronta de volta para o usuário no WhatsApp
            })
            
            fs.unlinkSync(caminhoImagem) // Exclui a imagem original da pasta de mídias recebidas para economizar espaço
            fs.unlinkSync(caminhoFigurinha) // Exclui a figurinha pronta da pasta de figurinhas prontas para economizar espaço
            
            return
        }
        
        if (temVideo) {
            const segundosVideo = message.message.videoMessage.seconds || 0
            
            if (segundosVideo > 10) {
                await sock.sendMessage(remoteJid, {
                    text: `Hmm, ${nome}, esse vídeo é muito longo. 😕\n\nMe envie um vídeo de no máximo 10 segundos, tá? 😉`
                })
                return
            }
            
            const caminhoVideo = path.join(pastaRecebidas, `${nomeArquivo}.mp4`)
            
            fs.writeFileSync(caminhoVideo, buffer) // Salva o vídeo recebido na pasta de mídias recebidas
            
            await converterVideoParaWebp(caminhoVideo, caminhoFigurinha) // Converte o vídeo para o formato WebP usando a função converterVideoParaWebp
            
            await sock.sendMessage(remoteJid, {
                sticker: { url: caminhoFigurinha } // Envia a figurinha pronta de volta para o usuário no WhatsApp
            })
            
            fs.unlinkSync(caminhoVideo) // Exclui o vídeo original da pasta de mídias recebidas para economizar espaço
            fs.unlinkSync(caminhoFigurinha) // Exclui a figurinha pronta da pasta de figurinhas prontas para economizar espaço
            
            return
        }
        
    } catch (error) {
        console.log('Erro ao processar a mídia para figurinha:', error)
        
        await sock.sendMessage(remoteJid, {
            text: `Ops, ${nome}, ocorreu um erro ao processar a mídia para criar a figurinha. 😕\n\nTente me enviar outra imagem ou vídeo, por favor! 😉`
        })
    }
}

module.exports = modoFigurinha