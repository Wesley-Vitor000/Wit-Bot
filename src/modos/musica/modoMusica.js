const { exec } = require('child_process')
const fs = require('fs')
const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')

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
            caption: `Você escolheu o Modo Música, ${nome}! 🎵\n\nNesse modo, você pode me enviar links de músicas do YouTube, e eu vou baixar a música para você e enviar ela de volta aqui no WhatsApp! 😎\n\nÉ só me enviar o link do video a qual você queira extrair o áudio, e eu faço o resto! 🚀`
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

            await sock.sendMessage(remoteJid, {
                image: { url: 'modos/musica/imagens/baixando_musica_img.png' },
                caption: `Recebi sua música, ${nome}!\n\n🎵 *${infoMusica.titulo}*\n\n⏱️ Duração: ${infoMusica.duracao}\n\nVou baixar o áudio agora mesmo, aguarde um momentinho... ⏳`
            })

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
}

module.exports = modoMusica