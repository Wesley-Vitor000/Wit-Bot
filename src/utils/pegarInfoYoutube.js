const { exec } = require('child_process')
const formatarDuracao = require('./formatarDuracao')

function pegarInfoYoutube(link) {
    return new Promise((resolve, reject) => {
        const caminhoCookies = path.join('/tmp', 'cookies.txt')

if (process.env.YOUTUBE_COOKIES) {
    fs.writeFileSync(caminhoCookies, process.env.YOUTUBE_COOKIES)
}

const comando = `python3 -m yt_dlp --cookies "${caminhoCookies}" --extractor-args "youtube:player_client=android" --remote-components ejs:github --js-runtime deno --dump-json --no-playlist "${link}"`

        exec(comando, (error, stdout) => {
            if (error) {
                reject(error)
                return
            }

            try {
                const info = JSON.parse(stdout)

                resolve({
                    titulo: info.title || 'Video do YouTube',
                    duracao: info.duration ? formatarDuracao(info.duration) : 'Duração Não informada',
                })
            } catch (erroJson) {
                reject(erroJson)
            }
        })
    })
}

module.exports = pegarInfoYoutube