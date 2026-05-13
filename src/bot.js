
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const express = require('express')
const QRCode = require('qrcode')
const pino = require('pino')

let sockAtual = null
let botRodando = false
let qrAtual = null
let statusBot = 'desconectado'

const app = express()
const PORT = process.env.PORT || 3000

function paginaBase(conteudo) {
    return `
        <body style="background:#050510;color:white;font-family:Arial;text-align:center;padding:40px">

            <h1>🤖 Wit Bot</h1>

            ${conteudo}

            <hr style="margin:30px 0;border-color:#222">

            <form action="/ligar" method="POST" style="margin-top:15px">
                <button>▶️ Ligar Bot</button>
            </form>

            <form action="/reiniciar" method="POST" style="margin-top:15px">
                <button>🔁 Reiniciar Bot</button>
            </form>

            <form action="/desligar" method="POST" style="margin-top:15px">
                <button>⏸️ Pausar Bot</button>
            </form>

        </body>
    `
}

app.get('/', async (req, res) => {

    if (!qrAtual) {

        return res.send(
            paginaBase(`
                <h2>⏳ Aguardando QR Code...</h2>
            `)
        )
    }

    const qrImagem = await QRCode.toDataURL(qrAtual)

    res.send(
        paginaBase(`
            <img src="${qrImagem}" style="width:320px;background:white;padding:20px;border-radius:20px;">
        `)
    )
})

async function startBot() {

    if (botRodando) return

    botRodando = true

    const { state, saveCreds } = await useMultiFileAuthState('auth')

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Wit Bot', 'Chrome', '1.0.0'],
        version,
        printQRInTerminal: false
    })

    sockAtual = sock

    sock.ev.on('connection.update', (update) => {

        const { connection, qr } = update

        if (qr) {
            qrAtual = qr
            console.log('QR atualizado')
        }

        if (connection === 'open') {
            console.log('Bot conectado!')
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})

startBot()
