const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const msg = require('../../utils/mensagensWit')
const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')
const pesquisarYoutube = require('../../utils/pesquisarYoutube')
const { tentarEstrategias } = require('../../utils/witDownloaderEngine')

async function baixarVideoYoutube(link, saidaVideo, caminhoVideo) {
    const base = `python3 -m yt_dlp --no-playlist --force-overwrites`

    const formatoSimples = `-f "best[height<=360][ext=mp4]/best[height<=360]/best"`
    const formatoSeparado = `-f "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best"`

    const estrategias = [
        {
            nome: 'android mp4 simples',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=android" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'android creator',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=android_creator" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'android testsuite',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=android_testsuite" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'ios',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=ios" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'web',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=web" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'mweb',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=mweb" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'web embedded',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=web_embedded" ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'android separado',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=android" ${formatoSeparado} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'ios separado',
            arquivoFinal: caminhoVideo,
            comando: `${base} --extractor-args "youtube:player_client=ios" ${formatoSeparado} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        },
        {
            nome: 'normal simples',
            arquivoFinal: caminhoVideo,
            comando: `${base} ${formatoSimples} --merge-output-format mp4 -o "${saidaVideo}" "${link}"`
        }
    ]

    const resultado = await tentarEstrategias(estrategias)

    if (!resultado.sucesso) {
        throw new Error('Todas as estratégias de vídeo falharam')
    }

    return resultado
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