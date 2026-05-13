const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')


let qrAtual = null
let statusBot = 'desconectado'

const express = require('express')
const QRcode = require('qrcode')
const pino = require('pino')

const modoYoutube = require('./modos/youtube/modoYoutube')
const modoMusica = require('./modos/musica/modoMusica')
const modoFigurinha = require('./modos/figurinhas/modoFigurinha')

const modoUsuarios = {}

const app = express()
const PORT = process.env.PORT || 3000 // Porta padrão para desenvolvimento local

app.get('/', async (req, res) => {

    if (!qrAtual) {

        return res.send(`
            <body style="background:#050510;color:white;font-family:Arial;text-align:center;padding:40px">
                <h1>⏳ Aguardando QR Code...</h1>
                <p>O bot ainda não gerou um QR.</p>
            </body>
        `)
    }

    const qrImagem = await QRCode.toDataURL(qrAtual)

    res.send(`
        <body style="background:#050510;color:white;font-family:Arial;text-align:center;padding:40px">

            <h1>🤖 Wit Bot</h1>

            <p>Status: ${statusBot}</p>

            <img 
                src="${qrImagem}" 
                style="
                    width:320px;
                    background:white;
                    padding:20px;
                    border-radius:20px;
                "
            >

        </body>
    `)
})

async function mostrarMenu(sock, remoteJid, nome) {
    await sock.sendMessage(remoteJid, {
        image: { url: 'assets/menu/menu_inicial_img.png' },
        caption: `Aqui está o menu, ${nome}!!\n\n•1. Modo Youtube\n•2. Modo Música\n•3. Modo Figurinhas\n\nDigite o número da opção desejada que eu vou te mostrar mais detalhes! 😉`
    })
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    const { version } = await fetchLatestBaileysVersion()

    console.log('Versão do WhatsApp Web:', version)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Wit Bot', 'Chrome', '1.0.0'],
        version,
        printQRInTerminal: false
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update

        if (qr) {
            qrAtual = qr
            statusBot = 'Aguardando conexão'
            console.log('QR Code atualizado, aguardando escaneamento...')
        }

        if (connection === 'open') {
            statusBot = 'conectado'
            qrAtual = null
            console.log('🔥 Bot conectado com sucesso!')
        }

        if (connection === 'close') {
            statusBot = 'desconectado'
            const statusCode = lastDisconnect?.error?.output?.statusCode

            console.log('⚠️ Conexão fechada. Código:', statusCode)

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('🔁 Tentando reconectar...')
                startBot()
            } else {
                console.log('❌ Sessão desconectada. Apague a pasta auth e escaneie de novo.')
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0]

        if (!message.message) return

        const remoteJid = message.key.remoteJid

        if (message.key.fromMe) {
            console.log('⚠️ Mensagem enviada por mim mesmo, ignorando resposta automática.')
            return
        }

        if (remoteJid.endsWith('@g.us')) {
            console.log('⚠️ Mensagem recebida de grupo, ignorando.')
            return
        }

        const nome = message.pushName || 'Desconhecido'

        const text =
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            ''

        const textNormalizado = text.toLowerCase().trim()

        console.log('📩 Mensagem recebida:', text)

        if (textNormalizado === '/menu') {
            await mostrarMenu(sock, remoteJid, nome)
            return
        }

        if (textNormalizado === '1') {
            await modoYoutube(sock, remoteJid, nome, text, modoUsuarios)
            return
        }

        if (textNormalizado === '2') {
            await modoMusica(sock, remoteJid, nome, text, modoUsuarios)
            return
        }

        if (textNormalizado === '3') {
            await modoFigurinha(sock, remoteJid, nome, text, modoUsuarios, message)
            return
        }

        if (modoUsuarios[remoteJid] === 'youtube') {
            await modoYoutube(sock, remoteJid, nome, text, modoUsuarios)
            return
        }

        if (modoUsuarios[remoteJid] === 'musica') {
            await modoMusica(sock, remoteJid, nome, text, modoUsuarios)
            return
        }

        if (modoUsuarios[remoteJid] === 'figurinha') {
            await modoFigurinha(sock, remoteJid, nome, text, modoUsuarios, message)
            return
        }

        await sock.sendMessage(remoteJid, {
            image: { url: 'assets/geral/apresentacao_img.jpeg' },
            caption: `Olá, ${nome}! Tudo baum?\n\nMe chamo Wit, é um prazer te conhecer!🤝\n\nDigite */menu* para visualizar o meu menu, ok?😁`
        })
    })
}

app.listen(PORT, () => { // Inicia o servidor Express
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
})

startBot()