const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const limparLinkYoutube = require('../../utils/limparLinkYoutube')
const pegarInfoYoutube = require('../../utils/pegarInfoYoutube')
const pesquisarYoutubeMusica = require('../../utils/pesquisarYoutubeMusicas')

function baixarMusicaYoutube(link, saidaMusica) {
    return new Promise((resolve, reject) => {
        
        
        const comando = `python3 -m yt_dlp --extractor-args "youtube:player_client=android" --no-playlist --js-runtime node -f "bestaudio/best" -x --audio-format mp3 --audio-quality 5 --force-overwrites -o "${saidaMusica}" "${link}"`
        
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
            text: `Você escolheu o Modo Música, ${nome}! 🎵

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
    
    let link
    let videoEncontrado = null
    
    // Essa pasta é onde as músicas baixadas serão salvas.
    // O __dirname aponta para a pasta atual deste arquivo: src/modos/musica
    // Assim funciona tanto no Windows quanto no Railway/Linux.
    const pastaMusicas = path.join(__dirname, 'musicas-baixadas')
    
    // Essa linha garante que a pasta exista.
    // Se a pasta não existir no Railway, o Node cria automaticamente.
    fs.mkdirSync(pastaMusicas, { recursive: true })
    
    // Caminho final do arquivo mp3 depois que o yt-dlp terminar.
    const caminhoMusica = path.join(pastaMusicas, 'musica.mp3')
    
    // Modelo de saída usado pelo yt-dlp.
    // O %(ext)s será trocado automaticamente por mp3.
    const saidaMusica = path.join(pastaMusicas, 'musica.%(ext)s')
    
    if (textoNormalizado.includes('youtube.com') || textoNormalizado.includes('youtu.be')) {
        let match = text.match(/(https?:\/\/[^\s]+)/g)
        
        if (!match) {
            await sock.sendMessage(remoteJid, {
                text: `Hmm, ${nome}, esse link não é válido. 😕\n\nMe manda um link válido do YouTube, tá? 😉`
            })
            
            return
        }
        
        link = match[0]
        link = limparLinkYoutube(link)
        
    } else {
        await sock.sendMessage(remoteJid, {
            text: '🔎 Pesquisando música no YouTube...'
        })
        
        videoEncontrado = await pesquisarYoutubeMusica(text)
        
        if (!videoEncontrado) {
            await sock.sendMessage(remoteJid, {
                text: `Poxa, ${nome}! 😕\n\nNão consegui encontrar essa música no YouTube. Tente enviar um link ou me mande o nome de outra música.. 🙁`
            })
            
            return
        }
        
        link = videoEncontrado.url
        
        await sock.sendMessage(remoteJid, {
            image: { url: videoEncontrado.thumbnail },
            caption: `✅ Música encontrada!

🎵 ${videoEncontrado.titulo}
📺 Canal: ${videoEncontrado.canal}
⏱️ Duração: ${videoEncontrado.duracao}

⬇️ Baixando agora...`
        })
    }
    
    try {
        let infoMusica
        
        try {
            infoMusica = await pegarInfoYoutube(link)
        } catch (error) {
            console.log('Erro ao pegar as informações do vídeo:', error)
            
            infoMusica = {
                titulo: videoEncontrado?.titulo || 'Música do YouTube',
                duracao: videoEncontrado?.duracao || 'Duração não informada',
                thumbnail: videoEncontrado?.thumbnail
            }
        }
        
        await baixarMusicaYoutube(link, saidaMusica)
        
        if (!fs.existsSync(caminhoMusica)) {
            throw new Error('Arquivo de música não foi encontrado')
        }
        
        const buffer = fs.readFileSync(caminhoMusica)
        
        await sock.sendMessage(remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false
        })
        
        if (infoMusica.thumbnail || videoEncontrado?.thumbnail) {
            await sock.sendMessage(remoteJid, {
                image: { url: infoMusica.thumbnail || videoEncontrado?.thumbnail },
                caption: `🎵 *${infoMusica.titulo}*\n\n⏱️ Duração: ${infoMusica.duracao}\n\nAqui está a música que você pediu, ${nome}! 🎵`
            })
        } else {
            await sock.sendMessage(remoteJid, {
                text: `🎵 *${infoMusica.titulo}*\n\n⏱️ Duração: ${infoMusica.duracao}\n\nAqui está a música que você pediu, ${nome}! 🎵`
            })
        }
        
        setTimeout(() => {
            if (fs.existsSync(caminhoMusica)) {
                fs.unlinkSync(caminhoMusica)
            }
        }, 10000)
        
    } catch (error) {
        console.log('Erro ao baixar a música:', error)
        
        await sock.sendMessage(remoteJid, {
            text: `Poxa, ${nome}! 😕\n\nNão consegui baixar a música. Tente novamente mais tarde ou me envia um outro link.. 🙁`
        })
    }
    
    return
}

module.exports = modoMusica