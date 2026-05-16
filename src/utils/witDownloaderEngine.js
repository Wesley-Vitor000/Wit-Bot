const { exec } = require('child_process')
const fs = require('fs')

function executarComando(comando) {
    return new Promise((resolve, reject) => {
        exec(comando, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr })
                return
            }

            resolve({ stdout, stderr })
        })
    })
}

async function tentarEstrategias(estrategias) {
    let ultimoErro = null

    for (const estrategia of estrategias) {
        try {
            console.log(`🧪 Tentando estratégia: ${estrategia.nome}`)

            if (fs.existsSync(estrategia.arquivoFinal)) {
                fs.unlinkSync(estrategia.arquivoFinal)
            }

            await executarComando(estrategia.comando)

            if (fs.existsSync(estrategia.arquivoFinal)) {
                console.log(`✅ Estratégia funcionou: ${estrategia.nome}`)

                return {
                    sucesso: true,
                    estrategia: estrategia.nome,
                    arquivo: estrategia.arquivoFinal
                }
            }

            ultimoErro = `Arquivo não encontrado após: ${estrategia.nome}`
        } catch (erro) {
            console.log(`❌ Falhou: ${estrategia.nome}`)
            console.log(erro.stderr || erro.error)

            ultimoErro = erro.stderr || erro.error
        }
    }

    return {
        sucesso: false,
        erro: ultimoErro
    }
}

module.exports = {
    tentarEstrategias
}