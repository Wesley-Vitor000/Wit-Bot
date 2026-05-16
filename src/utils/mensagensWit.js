const estilo = {
    youtube: (nome) => `╭─〔 🎬 𝙈𝙊𝘿𝙊 𝙔𝙊𝙐𝙏𝙐𝘽𝙀 〕─╮

👤 Usuário: ${nome}
📥 Envie o nome ou link
do vídeo que deseja baixar.

╰────────────────╯`,

    musica: (nome) => `╭─〔 🎵 𝙈𝙊𝘿𝙊 𝙈𝙐𝙎𝙄𝘾𝘼 〕─╮

👤 Usuário: ${nome}
🎧 Envie o nome ou link
da música desejada.

╰────────────────╯`,

    figurinha: (nome) => `╭─〔 🖼️ 𝙈𝙊𝘿𝙊 𝙁𝙄𝙂𝙐𝙍𝙄𝙉𝙃𝘼 〕─╮

👤 Usuário: ${nome}
📸 Envie uma imagem,
GIF ou vídeo curto.

✨ Eu transformo em figurinha.

╰────────────────╯`,

    voz: (nome) => `╭─〔 🎙️ 𝙈𝙊𝘿𝙊 𝙑𝙊𝙕𝙀𝙎 〕─╮

👤 Usuário: ${nome}

1 • Grave 😈
2 • Fina 🐤
3 • Eco 🌌
4 • Rápida ⚡
5 • Lenta 🐢

🎧 Escolha um efeito
e envie um áudio.

╰────────────────╯`,

    erro: (titulo, detalhe) => `╭─〔 ⚠️ ${titulo} 〕─╮

${detalhe}

╰────────────────╯`,

    sucesso: (titulo, detalhe) => `╭─〔 ✅ ${titulo} 〕─╮

${detalhe}

╰────────────────╯`
}

module.exports = estilo