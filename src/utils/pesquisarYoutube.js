const yts = require('yt-search')

async function pesquisarYoutube(termo) {
    const resultado = await yts(termo)

    const video = resultado.videos[0]

    if (!video) {
        return null
    }

    return {
        titulo: video.title,
        url: video.url,
        duracao: video.timestamp,
        canal: video.author.name,
        views: video.views
    }
}

module.exports = pesquisarYoutube