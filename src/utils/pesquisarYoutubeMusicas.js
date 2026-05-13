const ytMusica = require('yt-search');

async function pesquisarYoutubeMusica(termo) {
    const resultado = await ytMusica(termo);

    const video = resultado.videos[0];

    if (!video) {
        return null;
    }

    return {
        titulo: video.title,
        url: video.url,
        duracao: video.timestamp,
        canal: video.author.name,
        views: video.views,
        thumbnail: video.thumbnail
    };
}

module.exports = pesquisarYoutubeMusica;