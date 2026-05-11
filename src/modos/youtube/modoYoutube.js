const { exec } = require('child_process')
const fs = require('fs')
const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')

function baixarVideoYoutube(link) {
    return new Promise((resolve, reject) => {
        const comando = `python -m yt_dlp --js-runtime node -f "bestvideo[height<=360][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=360][ext=mp4][vcodec^=avc1]" --merge-output-format mp4 --force-overwrites -o "modos/youtube/videos-baixados/video.%(ext)s" "${link}"`

        exec(comando, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao baixar o vídeo:', error)
                reject(error)
                return
            }

            console.log('STDOUT:', stdout)
            console.log('STDERR:', stderr)
            resolve(stdout)
        })
    })
}

async function modoYoutube(sock, remoteJid, nome, text, modoUsuarios) {

    const textoNormalizado = text.toLowerCase().trim()

    if (textoNormalizado === '1') {
        modoUsuarios[remoteJid] = 'youtube'
        await sock.sendMessage(remoteJid, {
            image: { url: 'modos/youtube/imagens/modo_youtube.jpeg' },
            caption: `Você escolheu o Modo Youtube, ${nome}! 🎥\n\nNesse modo, você pode me enviar links de vídeos do Youtube, e eu vou baixar o vídeo para você e enviar ele de volta aqui no WhatsApp! 😎\n\nÉ só me enviar o link do vídeo que você quer baixar, e eu faço o resto! 🚀`
        })
        return
    }

    if (textoNormalizado.includes('youtube.com') || textoNormalizado.includes('youtu.be')) {

        const match = text.match(/(https?:\/\/[^\s]+)/g)

        if (!match) {
            await sock.sendMessage(remoteJid, {
                image: { url: 'modos/youtube/imagens/erro_baixar_video_yt.png' },
                caption: `Poxa, ${nome}, não encontrei nenhum link válido na sua mensagem 😕\n\nPode mandar o link direto aqui mesmo, tá? 😉`
            })
            return
        }

        let link = match[0]
        link = limparLinkYoutube(link)

        try {
            let infoVideo

            try {
                infoVideo = await pegarInfoYoutube(link)
            } catch (error) {
                console.log('Erro ao pegar as informações do vídeo:', error)

                infoVideo = {
                    titulo: 'Vídeo do YouTube',
                    duracao: 'Duração Não informada'
                }
            }

            await sock.sendMessage(remoteJid, {
                image: { url: 'modos/youtube/imagens/baixando_video_yt.png' },
                caption: `🎬 *${infoVideo.titulo}*\n⏱️ Duração: ${infoVideo.duracao}\n\nO video já tá na mão!\n\nVou baixar agora, aguarde um momentinho... ⏳`
            })

            await baixarVideoYoutube(link)

            await sock.sendMessage(remoteJid, {
                text: `😁 Prontinho! Download finalizado, ${nome}! Agora vou enviar o vídeo pra você...`
            })

            const caminhoVideo = 'modos/youtube/videos-baixados/video.mp4'
            const tamanhoMB = fs.statSync(caminhoVideo).size / (1024 * 1024)

            if (tamanhoMB > 90) {
                await sock.sendMessage(remoteJid, {
                    image: { url: 'modos/youtube/imagens/erro_video_grande_yt.png' },
                    caption: `Caramba, ${nome}, esse video é um pouquinho grande ó:\n(${tamanhoMB.toFixed(1)} MB)\n\n O Whatsapp não permite esse tamanho de envio.. 😕\n\nTenta um vídeo mais curtinho, pode ser?!\n\nPode mandar o novo link direto, tá?`
                })

                if (fs.existsSync(caminhoVideo)) {
                    fs.unlinkSync(caminhoVideo)
                }

                return
            }

            await sock.sendMessage(remoteJid, {
                video: { url: caminhoVideo },
                caption: `🎬 *${infoVideo.titulo}*\n\n⏱️ Duração: ${infoVideo.duracao}\n\nAqui está o vídeo que você pediu, ${nome}! 🎬`
            })

            setTimeout(() => {
                if (fs.existsSync(caminhoVideo)) {
                    fs.unlinkSync(caminhoVideo)
                }
            }, 3000)

        } catch (error) {
            console.log('Erro ao baixar o vídeo:', error)

            const caminhoVideo = 'modos/youtube/videos-baixados/video.mp4'

            if (fs.existsSync(caminhoVideo)) {
                fs.unlinkSync(caminhoVideo)
            }

            await sock.sendMessage(remoteJid, {
                image: { url: 'modos/youtube/imagens/erro_baixar_video_yt.png' },
                caption: `Poxa, ${nome}, esse vídeo específico não deu pra baixar😕\n\nEle pode estar com proteção do YouTube, restrição ou formato bloqueado.\nTenta mandar outro link.\n\nPode mandar direto aqui mesmo, tá? 😉`
            })
        }
        return
    }

    await sock.sendMessage(remoteJid, {
        image: { url: 'modos/youtube/imagens/link_invalido_img.png' },
        caption: `Hmm, ${nome}, esse link não é válido. 😕\n\nMe manda um link válido do YouTube, tá? 😉`
    })
}

module.exports = modoYoutube