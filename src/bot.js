const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const QRCode = require('qrcode')
const pino = require('pino')

const modoYoutube = require('./modos/youtube/modoYoutube')
const modoMusica = require('./modos/musica/modoMusica')
const modoFigurinha = require('./modos/figurinhas/modoFigurinha')


// Modo Atual do Bot
const modoUsuarios = {} // Isso aqui é para armazenar o modo atual de cada usuário, usando o número do contato como chave e o modo como valor. Exemplo: { '5511999999999': 'youtube' }


// ================================
// FUNÇÕES DO BOT
// ================================

async function mostrarMenu(sock, remoteJid, nome) {
    await sock.sendMessage(remoteJid, {
        image: { url: 'assets/menu/menu_inicial_img.png' },
        caption: `Aqui está o menu, ${nome}!!\n\n•1. Modo Youtube\n•2. Modo Música\n•3. Modo Figurinhas\n\nDigite o número da opção desejada que eu vou te mostrar mais detalhes! 😉`
    }) // Exemplo de resposta para o comando /menu
}




// ================================================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    const { version } = await fetchLatestBaileysVersion() // Serve para garantir que estamos usando a versão mais recente do WhatsApp Web
    console.log('Versão do WhatsApp Web:', version)

    const sock = makeWASocket({ // Serve para criar a conexão com o WhatsApp
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Wit Bot', 'Chrome', '1.0.0'],
        version: version,
        printQRInTerminal: false // False aqui para não mostrar o QR Code no terminal, já que vamos usar o qrcode-terminal para isso
    })

    const numeroBot = process.env.NUMERO_BOT  // Isso aqui é para pegar o número do bot a partir de uma variável de ambiente, para que possamos usar o mesmo código em diferentes bots sem precisar alterar o código-fonte. O número do bot deve estar registrado no WhatsApp para que isso funcione.

    if (!numeroBot) {
        console.log('❌ Por favor, defina a variável de ambiente NUMERO_BOT com o número do bot (incluindo o código do país, sem espaços ou símbolos). Exemplo: 5511999999999')
        process.exit(1) // Isso aqui é para encerrar o processo do bot se a variável de ambiente não estiver definida, para evitar erros posteriores.
    }


    sock.ev.on('connection.update', async(update) => {
        const { connection, qr, lastDisconnect } = update //
        
         if (qr) {
             await QRCode.toFile('qr-wit-bot.png', qr) // Isso aqui é para gerar um arquivo de imagem com o QR Code, para que o usuário possa escanear com o WhatsApp e autenticar o bot. O arquivo será salvo na raiz do projeto com o nome "qr-wit-bot.png".
             console.log('📸 QR Code gerado! Escaneie o arquivo qr-wit-bot.png com o WhatsApp para autenticar o bot.')
         }

        if (connection === 'open') {
            console.log('🔥 Bot conectado com sucesso!')
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            console.log('⚠️ Conexão fechada. Código:', statusCode)

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('🔁 Tentando reconectar...')
                startBot()
            } else {
                console.log('❌ Sessão desconectada. Apague a pasta auth e escaneie de novo.')
            }
        }
    }) // ← FECHAMENTO CORRETO DO connection.update


    if (!sock.authState.creds.registered) { // Isso aqui é para verificar se o número do bot está registrado, ou seja, se já foi escaneado o QR Code e autenticado com sucesso. Se não estiver registrado, ele vai mostrar o QR Code para o usuário escanear e autenticar.
        await new Promise(resolve => setTimeout(resolve, 10000)) // Isso aqui é para dar um pequeno delay antes de solicitar o código de pareamento, para garantir que a conexão com o WhatsApp esteja estabilizada e evitar erros de sincronização.
        
        const codigo = await sock.requestPairingCode(numeroBot) // Isso aqui é para solicitar o código de pareamento do WhatsApp, que é necessário para gerar o QR Code. O número do bot deve estar registrado no WhatsApp para que isso funcione.

        console.log('\n=================================')
        console.log('🔐 CÓDIGO DE PAREAMENTO DO WHATSAPP:')
        console.log(codigo)
        console.log('=================================\n')

    }


    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0] // Isso aqui é para pegar a primeira mensagem do array de mensagens recebidas, já que o evento pode receber várias mensagens ao mesmo tempo.

        if (!message.message) return

        const remoteJid = message.key.remoteJid // Isso aqui é para pegar o ID do contato ou do grupo que enviou a mensagem, para que possamos responder a ele depois

        if (message.key.fromMe) {
            console.log('⚠️ Mensagem enviada por mim mesmo, ignorando resposta automática.')
            return
        }

        if (remoteJid.endsWith('@g.us')) {
            console.log('⚠️ Mensagem recebida de um grupo, ignorando resposta automática.')
            return
        }

        const numeroReal = message.key.remoteJidAlt || message.key.remoteJid // Isso aqui é para pegar o número real do contato, caso o WhatsApp tenha adicionado um sufixo para diferenciar contatos com o mesmo número (como em casos de contas comerciais)

        console.log(JSON.stringify(message, null, 2)) // Serve para mostrar a estrutura completa da mensagem recebida, útil para desenvolvimento

        const nome = message.pushName || 'Desconhecido' // Isso aqui é para pegar o nome do contato que enviou a mensagem, ou usar "Desconecido" se não tiver um nome disponível

        const text =
            message.message.conversation || // Então, aqui ele vai tentar pegar o texto da mensagem, seja ela uma mensagem simples ou uma mensagem estendida (como mensagens de grupo ou mensagens com mídia)
            message.message.extendedTextMessage?.text || // E aqui ele tenta pegar o texto de mensagens estendidas, como mensagens de grupo ou mensagens com mídia
            '' // Se não conseguir pegar o texto, ele vai retornar uma string vazia para evitar erros

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

        // Aqui ele vai verificar se o usuário está no Modo Youtube, e se estiver, ele vai chamar a função do Modo Youtube para processar a mensagem de acordo com as regras desse modo. Isso é útil para manter o contexto da conversa e oferecer uma experiência mais personalizada para o usuário.
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
        }) // Exemplo de como enviar uma mensagem para um contato específico (substitua remoteJid pelo número do contato ou ID do grupo)
    })
}

startBot()