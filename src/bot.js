const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const fs = require('fs')
const path = require('path')

let sockAtual = null // Variável global para armazenar a instância do socket, que nada mais é do que a conexão do bot com o WhatsApp Web
let botRodando = false
let qrAtual = null
let statusBot = 'desconectado'
let ultimoEvento = 'Bot ainda não iniciou'
let ultimaAtualizacao = new Date().toLocaleString('pt-BR')

const express = require('express')
const QRCode = require('qrcode')
const pino = require('pino')

const modoYoutube = require('./modos/youtube/modoYoutube')
const modoMusica = require('./modos/musica/modoMusica')
const modoFigurinha = require('./modos/figurinhas/modoFigurinha')

const modoUsuarios = {}

const app = express()
const PORT = process.env.PORT || 3000 // Porta padrão para desenvolvimento local

// Permite que o Express entenda dados enviados por formulários HTML
// Isso ajuda os botões POST do painel a funcionarem corretamente
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

function atualizarStatus(novoStatus, evento) {
    statusBot = novoStatus
    ultimoEvento = evento
    ultimaAtualizacao = new Date().toLocaleString('pt-BR')
}

function gerarPagina(conteudoPrincipal) {
    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="5">
            <title>Wit Bot - Conexão</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    min-height: 100vh;
                    background: radial-gradient(circle at top, #15102b, #050510 60%);
                    color: white;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }

                .card {
                    width: 100%;
                    max-width: 430px;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 24px;
                    padding: 26px;
                    box-shadow: 0 0 40px rgba(94, 92, 255, 0.18);
                    text-align: center;
                }

                h1 {
                    margin-top: 0;
                    font-size: 28px;
                }

                .status {
                    display: inline-block;
                    margin: 10px 0 18px;
                    padding: 8px 14px;
                    border-radius: 999px;
                    background: rgba(0, 255, 170, 0.12);
                    border: 1px solid rgba(0, 255, 170, 0.35);
                    color: #6dffc7;
                    font-size: 14px;
                }

                .info {
                    color: #b9b9c9;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 18px;
                }

                .qr {
                    width: 320px;
                    max-width: 100%;
                    background: white;
                    padding: 18px;
                    border-radius: 20px;
                    margin: 14px 0;
                }

                .buttons {
                    display: grid;
                    gap: 12px;
                    margin-top: 24px;
                }

                button {
                    width: 100%;
                    border: 0;
                    border-radius: 14px;
                    padding: 14px 16px;
                    font-size: 15px;
                    font-weight: bold;
                    cursor: pointer;
                    background: linear-gradient(135deg, #5ffcff, #8f7bff);
                    color: #050510;
                }

                .danger {
                    background: linear-gradient(135deg, #ff6b6b, #ff3b3b);
                    color: white;
                }

                .pause {
                    background: linear-gradient(135deg, #ffd166, #fca311);
                    color: #050510;
                }

                .footer {
                    margin-top: 20px;
                    color: #777790;
                    font-size: 12px;
                }
            </style>
        </head>

        <body>
            <div class="card">
                <h1>🤖 Wit Bot</h1>

                <div class="status">
                    Status: ${statusBot}
                </div>

                <div class="info">
                    <strong>Último evento:</strong><br>
                    ${ultimoEvento}<br><br>
                    <strong>Atualizado em:</strong><br>
                    ${ultimaAtualizacao}
                </div>

                ${conteudoPrincipal}

                <div class="buttons">
                    <form action="/ligar" method="POST">
                        <button type="submit">▶️ Ligar Bot</button>
                    </form>

                    <form action="/reiniciar" method="POST">
                        <button type="submit">🔁 Reiniciar / Reconectar</button>
                    </form>

                    <form action="/desligar" method="POST">
                        <button class="pause" type="submit">⏸️ Pausar Bot</button>
                    </form>

                    <form action="/logout" method="POST">
                        <button class="danger" type="submit">🚪 Deslogar WhatsApp</button>
                    </form>

                    <form action="/resetar-sessao" method="POST">
    <button class="danger" type="submit">🧹 Resetar sessão e gerar novo QR</button>
</form>
                </div>

                <div class="footer">
                    A página atualiza sozinha a cada 5 segundos.
                </div>
            </div>
        </body>
        </html>
    `
}

app.get('/', async (req, res) => {
    if (statusBot === 'conectado') {
        return res.send(
            gerarPagina(`
                <h2 style="color:#6dffc7">✅ Bot conectado!</h2>
                <p class="info">O Wit Bot está online no WhatsApp.</p>
            `)
        )
    }

    if (!qrAtual) {
        return res.send(
            gerarPagina(`
                <h2>⏳ Aguardando QR Code...</h2>
                <p class="info">Se acabou de iniciar, aguarde alguns segundos. Se demorar muito, tente reiniciar.</p>
            `)
        )
    }

    const qrImagem = await QRCode.toDataURL(qrAtual)

    res.send(
        gerarPagina(`
            <h2>📲 Escaneie o QR Code</h2>
            <p class="info">Abra o WhatsApp no celular, vá em aparelhos conectados e escaneie.</p>
            <img class="qr" src="${qrImagem}">
        `)
    )
})

app.get('/status', (req, res) => {
    res.json({
        statusBot,
        botRodando,
        temQr: Boolean(qrAtual),
        ultimoEvento,
        ultimaAtualizacao
    })
})

app.post('/ligar', async (req, res) => {
    if (!botRodando) {
        atualizarStatus('ligando', 'Comando de ligar recebido pelo painel')
        startBot()
    }

    res.redirect('/')
})

app.post('/desligar', async (req, res) => {
    try {
        atualizarStatus('pausando', 'Comando de pausar recebido pelo painel')

        if (sockAtual) {
            sockAtual.end(new Error('Bot pausado pelo painel'))
        }
    } catch (error) {
        console.log('Erro ao pausar bot:', error)
    }

    sockAtual = null
    botRodando = false
    qrAtual = null
    atualizarStatus('pausado', 'Bot pausado pelo painel')

    res.redirect('/')
})

app.post('/reiniciar', async (req, res) => {
    try {
        atualizarStatus('reiniciando', 'Comando de reiniciar recebido pelo painel')

        if (sockAtual) {
            sockAtual.end(new Error('Bot reiniciado pelo painel'))
        }
    } catch (error) {
        console.log('Erro ao desligar antes de reiniciar:', error)
    }

    sockAtual = null
    botRodando = false
    qrAtual = null

    startBot()

    res.redirect('/')
})

app.post('/logout', async (req, res) => {
    try {
        atualizarStatus('deslogando', 'Comando de deslogar WhatsApp recebido pelo painel')

        if (sockAtual) {
            await sockAtual.logout()
        }
    } catch (error) {
        console.log('Erro ao deslogar:', error)
    }

    sockAtual = null
    botRodando = false
    qrAtual = null
    atualizarStatus('deslogado', 'Sessão do WhatsApp encerrada. Será necessário escanear QR novamente.')

    res.redirect('/')
})

async function mostrarMenu(sock, remoteJid, nome) {
    await sock.sendMessage(remoteJid, {
        image: {
            url: path.join(__dirname, '../assets/geral/apresentacao_img.jpeg')
        },
        caption: `Aqui está o menu, ${nome}!!\n\n•1. Modo Youtube\n•2. Modo Música\n•3. Modo Figurinhas\n\nDigite o número da opção desejada que eu vou te mostrar mais detalhes! 😉`
    })
}

async function startBot() {
    if (botRodando) {
        console.log('⚠️ O bot já está rodando.')
        return
    }

    botRodando = true
    atualizarStatus('iniciando', 'Inicializando conexão com WhatsApp')

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

    sockAtual = sock

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update

        if (qr) {
            qrAtual = qr
            atualizarStatus('aguardando conexão', 'QR Code atualizado, aguardando escaneamento')
            console.log('QR Code atualizado, aguardando escaneamento...')
        }

        if (connection === 'open') {
            qrAtual = null
            atualizarStatus('conectado', 'Bot conectado com sucesso ao WhatsApp')
            console.log('🔥 Bot conectado com sucesso!')
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            console.log('⚠️ Conexão fechada. Código:', statusCode)

            sockAtual = null
            botRodando = false

            if (statusBot === 'pausado' || statusBot === 'deslogado') {
                return
            }

            if (statusCode !== DisconnectReason.loggedOut) {
                atualizarStatus('reconectando', `Conexão fechada com código ${statusCode}. Tentando reconectar.`)
                console.log('🔁 Tentando reconectar...')
                startBot()
            } else {
                qrAtual = null
                atualizarStatus('desconectado', 'Sessão desconectada. Apague a pasta auth ou use logout e escaneie novamente.')
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
        ultimoEvento = `Mensagem recebida de ${nome}: ${text || '[mídia]'}`
        ultimaAtualizacao = new Date().toLocaleString('pt-BR')

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

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
})

app.post('/resetar-sessao', async (req, res) => {
    try {
        atualizarStatus('resetando sessão', 'Apagando pasta auth para gerar novo QR Code')

        if (sockAtual) {
            try {
                sockAtual.end(new Error('Sessão resetada pelo painel'))
            } catch (error) {
                console.log('Erro ao encerrar socket:', error)
            }
        }

        sockAtual = null
        botRodando = false
        qrAtual = null

        const caminhoAuth = path.join(__dirname, '..', 'auth')

        if (fs.existsSync(caminhoAuth)) {
            fs.rmSync(caminhoAuth, {
                recursive: true,
                force: true
            })

            console.log('🧹 Pasta auth apagada com sucesso.')
        }

        atualizarStatus('gerando novo QR', 'Sessão resetada. Gerando novo QR Code.')

        setTimeout(() => {
            startBot()
        }, 1000)

        res.redirect('/')

    } catch (error) {
        console.log('Erro ao resetar sessão:', error)

        atualizarStatus('erro', 'Erro ao resetar sessão pelo painel')

        res.redirect('/')
    }
})

startBot()
