const { exec } = require('child_process')
const formatarDuracao = require('./formatarDuracao')

function pegarInfoYoutube(link) {
    return new Promise((resolve, reject) => {
        const comando = `python3 -m yt_dlp --dump-json --no-playlist "${link}"`

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