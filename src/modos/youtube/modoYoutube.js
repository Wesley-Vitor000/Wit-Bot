const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')
const pesquisarYoutube = require('../../utils/pesquisarYoutube')

function baixarVideoYoutube(link, saidaVideo) {
    return new Promise((resolve, reject) => {

        const caminhoCookies = path.join('/tmp', 'cookies.txt')

        if (process.env.YOUTUBE_COOKIES) {
            fs.writeFileSync(caminhoCookies, process.env.YOUTUBE_COOKIES)
        }

        const comando = `python3 -m yt_dlp --cookies "${caminhoCookies}" --extractor-args "youtube:player_client=android" --remote-components ejs:github --js-runtime deno -f "best[height<=360][ext=mp4]/best[height<=360]" --force-overwrites -o "${saidaVideo}" "${link}"`

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
            text: msg.youtube(nome)
        })

        return
    }

    // =========================================
    // PREPARAR PASTA DE DOWNLOAD
    // =========================================

    let linkFinal = null
    let videoEncontrado = null

    // Essa pasta é onde os vídeos baixados serão salvos.
    // O __dirname aponta para a pasta atual deste arquivo: src/modos/youtube
    // Assim o caminho funciona tanto localmente quanto no Railway.
    const pastaVideos = path.join(__dirname, 'videos-baixados')

    // Essa linha garante que a pasta exista.
    // Se a pasta não existir no Railway, o Node cria automaticamente.
    fs.mkdirSync(pastaVideos, { recursive: true })

    // Caminho final do arquivo mp4 depois que o yt-dlp terminar.
    const caminhoVideo = path.join(pastaVideos, 'video.mp4')

    // Modelo de saída usado pelo yt-dlp.
    // O %(ext)s será trocado automaticamente pela extensão final.
    const saidaVideo = path.join(pastaVideos, 'video.%(ext)s')

    const ehLinkYoutube =
        textoNormalizado.includes('youtube.com') ||
        textoNormalizado.includes('youtu.be')

    // =========================================
    // SE FOR LINK
    // =========================================

    if (ehLinkYoutube) {
        const match = text.match(/(https?:\/\/[^\s]+)/g)

        if (!match) {
            await sock.sendMessage(remoteJid, {
                text: `Poxa, ${nome}, não encontrei nenhum link válido 😕`
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
            caption: `✅ Vídeo encontrado!

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

        await baixarVideoYoutube(linkFinal, saidaVideo)

        await sock.sendMessage(remoteJid, {
            text: `😁 Download finalizado, ${nome}!`
        })

        const tamanhoMB = fs.statSync(caminhoVideo).size / (1024 * 1024)

        // =========================================
        // VERIFICAR TAMANHO
        // =========================================

        if (tamanhoMB > 90) {
            await sock.sendMessage(remoteJid, {
                text: `Caramba, ${nome}, esse vídeo ficou grande demais 😕

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
            caption: `🎬 *${infoVideo.titulo}*

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