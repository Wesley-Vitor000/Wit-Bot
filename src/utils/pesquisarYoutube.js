const yts = require('yt-search') // Isso aqui é para importar a biblioteca yt-search, que é usada para pesquisar vídeos no YouTube. Ela é uma dependência do projeto e deve estar listada no package.json para que seja instalada corretamente. A função yts() é a principal função da biblioteca, que recebe uma string de pesquisa e retorna um objeto com os resultados da pesquisa, incluindo informações sobre os vídeos encontrados, como título, link, duração, etc.

module.exports = async function pesquisarYoutube(termo) {
    const resultado = await yts(termo) // Isso aqui é para chamar a função yts() com o termo de pesquisa fornecido como argumento. A função retorna uma promessa (Promise) que resolve para um objeto contendo os resultados da pesquisa no YouTube.

    const video = resultado.videos[0] // Isso aqui é para pegar o primeiro vídeo da lista de resultados retornada pela função yts(). O objeto resultado tem uma propriedade videos, que é um array de objetos representando os vídeos encontrados na pesquisa. Pegamos o primeiro vídeo usando o índice [0].

    if(!video) { // Isso aqui é para verificar se o vídeo existe, ou seja, se a pesquisa retornou algum resultado. Se não existir, a função retorna null para indicar que não foi encontrado nenhum vídeo correspondente ao termo de pesquisa.
        return null
    }

    return { // Isso aqui é para retornar um objeto contendo as informações do vídeo encontrado, como título, link, duração, etc. Essas informações são extraídas do objeto video retornado pela função yts() e organizadas em um formato mais simples e fácil de usar.
        title: video.title, // O título do vídeo encontrado.
        url: video.url, // O link do vídeo encontrado.
        duracao: video.timestamp, // A duração do vídeo encontrada, formatada como uma string (por exemplo, "3:45").
        canal: video.author.name, // O nome do canal que publicou o vídeo encontrado.
        views: video.views, // O número de visualizações do vídeo encontrado.
    }
}

module.exports = pesquisarYoutube // Isso aqui é para exportar a função pesquisarYoutube como o módulo principal do arquivo, para que ela possa ser importada e usada em outros arquivos do projeto, como o bot.js, onde será chamada para processar as mensagens dos usuários e fornecer respostas relacionadas a pesquisas no YouTube.
