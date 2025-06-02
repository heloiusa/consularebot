const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const token = '7921278119:AAEAoMReTva1No8JzKcA5JaSeBFfS5NsBcQ';
const bot = new TelegramBot(token, { polling: true });

const users = {};

const specialities = {
  '1': 'Psicologia',
  '2': 'Psiquiatria',
  '3': 'Terapia Ocupacional',
  '4': 'Fisioterapia',
  '5': 'Fonoaudiologia',
  '6': 'Oftalmologia',
  '7': 'Clínica Geral',
};

const csvFilePath = path.join(__dirname, 'agendamentos.csv');

// Cria o arquivo CSV com cabeçalhos, se não existir
if (!fs.existsSync(csvFilePath)) {
  fs.writeFileSync(csvFilePath, 'Nome,Telefone,Especialidade,DataHora\n', 'utf8');
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const user = users[chatId] || { step: 0 };

  if (text.toLowerCase() === '/start' || user.step === 0) {
    bot.sendMessage(chatId, `Olá! 👋\nEu sou o assistente virtual da *Consulare*, e estou aqui para te ajudar a agendar sua consulta médica de forma rápida e prática.\n\nVamos começar? Por favor, me informe o seu *nome completo* e *telefone com DDD*.`, { parse_mode: 'Markdown' });
    users[chatId] = { step: 1 };
    return;
  }

  if (user.step === 1) {
    const parts = text.split(/\n|,/);
    if (parts.length < 2) {
      return bot.sendMessage(chatId, 'Por favor, envie seu nome completo e telefone com DDD, separados por vírgula ou em linhas diferentes.');
    }

    users[chatId].nome = parts[0].trim();
    users[chatId].telefone = parts[1].trim();
    users[chatId].step = 2;

    const msgEspecialidades = `Agora, me diga com qual especialidade você deseja agendar a consulta:\n` +
      `1️⃣ Psicologia\n2️⃣ Psiquiatria\n3️⃣ Terapia Ocupacional\n4️⃣ Fisioterapia\n5️⃣ Fonoaudiologia\n6️⃣ Oftalmologia\n7️⃣ Clínica Geral\n8️⃣ Voltar ao menu anterior`;

    return bot.sendMessage(chatId, msgEspecialidades);
  }

  if (user.step === 2) {
    if (text === '8') {
      users[chatId].step = 0;
      return bot.sendMessage(chatId, 'Voltando ao menu... Envie /start para recomeçar.');
    }

    const escolha = specialities[text] || Object.values(specialities).find(s => s.toLowerCase() === text.toLowerCase());
    if (!escolha) {
      return bot.sendMessage(chatId, 'Opção inválida. Por favor, envie o número ou o nome da especialidade.');
    }

    users[chatId].especialidade = escolha;
    users[chatId].step = 3;

    return bot.sendMessage(chatId, `Agora, por favor, informe o *dia e horário* desejado para a consulta.\n🕒 A clínica atende de *segunda a sexta das 8h às 19h*, e aos *sábados das 8h às 12h*.`, { parse_mode: 'Markdown' });
  }

  if (user.step === 3) {
    const horarioRegex = /(\d{1,2})h/;
    const hora = parseInt((text.match(horarioRegex) || [])[1], 10);

    if (!hora || hora < 8 || (hora > 19 && !text.toLowerCase().includes('sábado'))) {
      return bot.sendMessage(chatId, 'Horário fora do permitido. Lembre-se: de segunda a sexta, das 8h às 19h; sábado, das 8h às 12h.');
    }

    users[chatId].dataHorario = text.trim();
    users[chatId].step = 4;

    return bot.sendMessage(chatId, `Vamos confirmar os dados da sua consulta:\n\n👤 *Nome:* ${users[chatId].nome}\n📞 *Telefone:* ${users[chatId].telefone}\n🩺 *Especialidade:* ${users[chatId].especialidade}\n📅 *Data e horário:* ${users[chatId].dataHorario}\n\nEstá tudo certo? Posso confirmar o agendamento? (sim/não)`, { parse_mode: 'Markdown' });
  }

  if (user.step === 4) {
    if (text.toLowerCase() === 'sim') {
      const { nome, telefone, especialidade, dataHorario } = users[chatId];

      // Escreve no CSV
      const linha = `"${nome}","${telefone}","${especialidade}","${dataHorario}"\n`;
      fs.appendFile(csvFilePath, linha, (err) => {
        if (err) {
          console.error('Erro ao salvar no CSV:', err);
          bot.sendMessage(chatId, 'Ocorreu um erro ao registrar sua consulta. Tente novamente mais tarde.');
        }
      });

      users[chatId].step = 5;
      return bot.sendMessage(chatId, `Perfeito! ✅ Sua consulta foi agendada com sucesso.\nVocê receberá uma mensagem de confirmação no dia do atendimento.\n\nObrigado por escolher a *Consulare*! 💙`, { parse_mode: 'Markdown' });
    } else {
      users[chatId].step = 0;
      return bot.sendMessage(chatId, 'Agendamento cancelado. Envie /start para começar novamente.');
    }
  }
});
