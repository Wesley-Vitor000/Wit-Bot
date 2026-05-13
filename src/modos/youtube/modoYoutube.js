const { exec } = require('child_process')
const fs = require('fs')

const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')
const pesquisarYoutube = require('../../utils/pesquisarYoutube')

function baixarVideoYoutube(link) {

    return new Promise((resolve, reject) => {

        const comando =
            `python3 -m yt_dlp --js-runtime node -f "bestvideo[height<=360][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=360][ext=mp4][vcodec^=avc1]" --merge-output-format mp4 --force-overwrites -o "modos/youtube/videos-baixados/video.%(ext)s" "${link}"`

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

    // =========================================
    // ENTRAR NO MODO YOUTUBE
    // =========================================

    if (textoNormalizado === '1') {

        modoUsuarios[remoteJid] = 'youtube'

        await sock.sendMessage(remoteJid, {

            text:
                `Você escolheu o Modo Youtube, ${nome}! 🎥

Nesse modo, você pode:

• Mandar links do YouTube
OU
• Digitar o nome do vídeo

Exemplo:
Nascer do Sol no YouTube

E eu vou pesquisar e baixar pra você 😎`
        })

        return
    }

    // =========================================
    // VERIFICA SE É LINK
    // =========================================

    let linkFinal = null

    const ehLinkYoutube =
        textoNormalizado.includes('youtube.com') ||
        textoNormalizado.includes('youtu.be')

    // =========================================
    // SE FOR LINK
    // =========================================

    let videoEncontrado = null

    if (ehLinkYoutube) {

        const match = text.match(/(https?:\/\/[^\s]+)/g)

        if (!match) {

            await sock.sendMessage(remoteJid, {
                text:
                    `Poxa, ${nome}, não encontrei nenhum link válido 😕`
            })

            return
        }

        linkFinal = limparLinkYoutube(match[0])
    }

    // =========================================
    // SE NÃO FOR LINK → PESQUISA NO YOUTUBE
    // =========================================

    else {

        await sock.sendMessage(remoteJid, {
            text: '🔎 Pesquisando vídeo no YouTube...'
        })

        videoEncontrado = await pesquisarYoutube(text)

        if (!videoEncontrado) {

            await sock.sendMessage(remoteJid, {
                text: '❌ Não encontrei nenhum vídeo com esse nome.'
            })

            return
        }

        linkFinal = videoEncontrado.url

        await sock.sendMessage(remoteJid, {

            image: { url: videoEncontrado.thumbnail },

            caption:
                `✅ Vídeo encontrado!

🎬 ${videoEncontrado.titulo}
📺 Canal: ${videoEncontrado.canal}
⏱️ Duração: ${videoEncontrado.duracao}

⬇️ Baixando agora...`
        })
    }

    // =========================================
    // BAIXAR VÍDEO
    // =========================================

    try {

        let infoVideo

        try {

            infoVideo = await pegarInfoYoutube(linkFinal)

        } catch (error) {

            console.log('Erro ao pegar informações:', error)

            infoVideo = {
                titulo: videoEncontrado?.titulo || 'Vídeo do YouTube',
                duracao: videoEncontrado?.duracao || 'Não informada'
            }
        }


    await baixarVideoYoutube(linkFinal)

    await sock.sendMessage(remoteJid, {
        text: `😁 Download finalizado, ${nome}!`
    })

    const caminhoVideo =
        'modos/youtube/videos-baixados/video.mp4'

    const tamanhoMB =
        fs.statSync(caminhoVideo).size / (1024 * 1024)

    // =========================================
    // VERIFICAR TAMANHO
    // =========================================

    if (tamanhoMB > 90) {

        await sock.sendMessage(remoteJid, {


            text:
                `Caramba, ${nome}, esse vídeo ficou grande demais 😕

📦 ${tamanhoMB.toFixed(1)} MB

O WhatsApp não deixa enviar 😭`
        })

        if (fs.existsSync(caminhoVideo)) {
            fs.unlinkSync(caminhoVideo)
        }

        return
    }

    // =========================================
    // ENVIAR VÍDEO
    // =========================================

    await sock.sendMessage(remoteJid, {

        video: { url: caminhoVideo },

        caption:
            `🎬 *${infoVideo.titulo}*

⏱️ Duração: ${infoVideo.duracao}

Aqui está seu vídeo 😎`
    })

    // =========================================
    // APAGAR ARQUIVO
    // =========================================

    setTimeout(() => {

        if (fs.existsSync(caminhoVideo)) {
            fs.unlinkSync(caminhoVideo)
        }

    }, 3000)

} catch (error) {

    console.log('Erro ao baixar vídeo:', error)

    const caminhoVideo =
        'modos/youtube/videos-baixados/video.mp4'

    if (fs.existsSync(caminhoVideo)) {
        fs.unlinkSync(caminhoVideo)
    }

    await sock.sendMessage(remoteJid, {

        text: `Poxa, ${nome}, não consegui baixar esse vídeo 😕

Pode estar:
• protegido
• restrito
• bloqueado pelo YouTube`
    })
}
}


module.exports = modoYoutube