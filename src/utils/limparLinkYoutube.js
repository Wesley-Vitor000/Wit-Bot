function limparLinkYoutube(link) {
    const url = new URL(link)
    const videoId = url.searchParams.get('v')

    if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`
    }

    return link
}

module.exports = limparLinkYoutube