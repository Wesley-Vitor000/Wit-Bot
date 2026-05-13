const { exec } = require('child_process')
const fs = require('fs')
const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')
const pesquisarYoutubeMusica = require('../../utils/pesquisarYoutubeMusicas')

function baixarMusicaYoutube(link) {
    return new Promise((resolve, reject) => {
        const comando = `python -m yt_dlp --no-playlist --js-runtime node -f "bestaudio/best" -x --audio-format mp3 --audio-quality 5 --force-overwrites -o "modos/musica/musicas-baixadas/musica.%(ext)s" "${link}"`

        exec(comando, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao baixar música:', error)
                reject(error)
                return
            }

            console.log('STDOUT:', stdout)
            console.log('STDERR:', stderr)
            resolve(stdout)
        })
    })
}

async function modoMusica(sock, remoteJid, nome, text, modoUsuarios) {

    const textoNormalizado = text.toLowerCase().trim()

    if (textoNormalizado === '2') {
        modoUsuarios[remoteJid] = 'musica'
        await sock.sendMessage(remoteJid, {
            image: { url: 'modos/musica/imagens/modo_musica.jpeg' },
            caption: `Você escolheu o Modo Música, ${nome}! 🎵

Nesse modo, você pode:

• Mandar links do YouTube
OU
• Digitar o nome do Música

Exemplo:
Céu - Sofia Cardoso

E eu vou pesquisar e baixar pra você 😎`
        })
        return
    }

    if (textoNormalizado.includes('youtube.com') || textoNormalizado.includes('youtu.be')) {

        let match = text.match(/(https?:\/\/[^\s]+)/g)

        if (!match) {
            await sock.sendMessage(remoteJid, {
                image: { url: 'modos/musica/imagens/link_invalido_img.png' },
                caption: `Hmm, ${nome}, esse link não é válido. 😕\n\nMe manda um link válido do YouTube, tá? 😉`
            })

            return
        }

        let link = match[0]
        link = limparLinkYoutube(link)

    } else {
        await sock.sendMessage(remoteJid, {
            text: '🔎 Pesquisando música no YouTube...'
        })

        const videoEncontrado = await pesquisarYoutubeMusica(text)

        if (!videoEncontrado) {
            await sock.sendMessage(remoteJid, {
                text: `Poxa, ${nome}! 😕\n\nNão consegui encontrar essa música no YouTube. Tente enviar um link ou me mande o nome de outra música.. 🙁`
            })

            return
        }

        link = videoEncontrado.url

        await sock.sendMessage(remoteJid, {

            image: { url: videoEncontrado.thumbnail },

            caption:
                `✅ Música encontrada!
🎵 ${videoEncontrado.titulo}\n\n⏱️ Duração: ${videoEncontrado.duracao}\n\n⬇️ Baixando agora...`
        })
    }

    try {
        let infoMusica

        try {
            infoMusica = await pegarInfoYoutube(link)
        } catch (error) {
            console.log('Erro ao pegar as informações do vídeo:', error)

            infoMusica = {
                titulo: 'Música do YouTube',
                duracao: 'Duração Não informada'
            }
        }

        await baixarMusicaYoutube(link)

        const caminhoMusica = 'modos/musica/musicas-baixadas/musica.mp3'

        if (!fs.existsSync(caminhoMusica)) {
            throw new Error('Arquivo de música não foi encontrado')
        }

        const buffer = fs.readFileSync(caminhoMusica)

        await sock.sendMessage(remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false
        })

        await sock.sendMessage(remoteJid, {
            text: `🎵 *${infoMusica.titulo}*\n\n⏱️ Duração: ${infoMusica.duracao}\n\nAqui está a música que você pediu, ${nome}! 🎵`
        })


        setTimeout(() => {
            if (fs.existsSync(caminhoMusica)) {
                fs.unlinkSync(caminhoMusica)
            }
        }, 10000)

    } catch (error) {
        console.log('Erro ao baixar a música:', error)

        await sock.sendMessage(remoteJid, {
            image: { url: 'modos/musica/imagens/erro_baixar_musica_img.png' },
            caption: `Poxa, ${nome}! 😕\n\nNão consegui baixar a música. Tente novamente mais tarde ou me envia um outro link.. 🙁`
        })
    }

    return
}

module.exports = modoMusica