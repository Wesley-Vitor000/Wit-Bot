function formatarDuracao(segundos) {
    const minutos = Math.floor(segundos / 60)
    const restoSegundos = segundos % 60

    return `${minutos}:${String(restoSegundos).padStart(2, '0')}`
}

module.exports = formatarDuracao