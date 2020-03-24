var express = require('express')
var app = express()
var bodyParser = require('body-parser')
const axios = require('axios')
const telegramCredentials = require('./telegramToken.js');
const telegramToken = telegramCredentials.telegramToken;

var state =
{
  users: new Object(),
  gamePrepared: false,
  gameStarted: false,
  players: new Object(),
}

app.use(bodyParser.json()); // for parsing application/json

app.use(
  bodyParser.urlencoded({
    extended: true
  })
); // for parsing application/x-www-form-urlencoded
//This is the route the API will call

app.post('/', function(req, res)
{
  const { message } = req.body;
  if (!message) {
    // In case a message is not present, do nothing and return an empty response
    return res.end();
  }
  // If we've gotten this far, it means that we have received a message.
  //Each message contains "text" and a "chat" object, which has an "id" which is the chat id
  const messageContent = message.text;
  const sender = message.from.id.toString();
  const sourceChat = message.chat.id;
  if(message.chat.type == "private")
  {
    state.users[sender] = {chatID: sender, username: message.from.username};
    writeTo(res, state.users[sender].chatID, "Ciao " + state.users[sender].username + ", ora puoi unirti a una partita, ti scriverò qui in privato se necessario");
    if(messageContent!= undefined && messageContent.startsWith("/dump"))
    {
      writeTo(res, state.users[sender].chatID, message);
      writeTo(res, state.users[sender].chatID, state);
    }
  }
  else if(message.chat.type == "group")
  {
    if(messageContent!= undefined && messageContent.startsWith("/dump"))
    {
      writeTo(res, sourceChat, message);
      writeTo(res, sourceChat, state);
    }
    else if(!Object.keys(state.users).includes(sender))
    {
      writeTo(res, sourceChat, "Ciao " + message.from.username + ", avvia @VirusInFabulaBot in privato prima di continuare");
    }
    else if(messageContent!= undefined && messageContent.startsWith("/prepareGame"))
    {
      if(!state.gamePrepared)
      {
        if(state.gameStarted)
        {
          writeTo(res, sourceChat, "La partita è già iniziata");
        }
        else
        {
          state.gamePrepared = true;
          writeTo(res, sourceChat, "Si prepara una nuova partita, unitevi scrivendo /join, poi avviate con /startGame");
        }
      }
      else
      {
        writeTo(res, sourceChat, "La partita è già pronta, unitevi scrivendo /join, poi avviate con /startGame");
      }
    }
    else if(messageContent!= undefined && messageContent.startsWith("/join"))
    {
      if(!Object.keys(state.players).includes(sender))
      {
        if(state.gameStarted)
        {
          writeTo(res, sourceChat, "Ciao " + users[sender].username + ", c'è già una partita in corso, attendi che finisca");
          writeTo(res, users[sender].chatID , "Ciao " + users[sender].username  + ", c'è già una partita in corso, attendi che finisca");
        }
        else if(state.gamePrepared)
        {
          state.players[sender] = state.users[sender];
          writeTo(res, sourceChat, state.players[sender].username + " si è unito alla partita");
          writeTo(res, state.players[sender].chatID , "Ciao " + state.players[sender].username  + ", ti sei unito a una partita");
        }
        else
        {
          writeTo(res, sourceChat, "Per cominciare una nuova partita, scrivere /prepareGame, aspettare che tutti i giocatori si uniscano con /join, poi rieseguire /startGame");
        }
      }
      else
      {
        writeTo(res, sourceChat, "Ciao " + state.players[sender].username + ", sei già in partita");
        writeTo(res, state.players[sender].chatID , "Ciao " + state.players[sender].username  + ", sei già in partita");
      }
    }
    else if(messageContent!= undefined && messageContent.startsWith("/startGame"))
    {
      if(state.gamePrepared)
      {
        state.gamePrepared = false;
        state.gameStarted = true;
        var response = "La partita ha inizio, i giocatori sono: ";
        var playerlist = "";
        Object.keys(state.players).forEach((player) =>
        {
          if(playerlist == "")
          {
            playerlist = state.players[player].username;
          }
          else
          {
            playerlist = playerlist + ", " + state.players[player].username;
          }
        });
        writeTo(res, sourceChat, response + playerlist);
      }
      else
      {
        if(state.gameStarted)
        {
          writeTo(res, sourceChat, "La partita è già iniziata");
        }
        else
        {
          writeTo(res, sourceChat, "Per cominciare una nuova partita, scrivere /prepareGame, aspettare che tutti i giocatori si uniscano con /join, poi rieseguire /startGame");
        }
      }
    }
    else if(!state.gamePrepared && !state.gameStarted)
    {
      writeTo(res, sourceChat, "Ciao " + message.from.username + ", prepara una partita con /prepareGame per continuare e poi avviala con /startGame");
    }
    else if(messageContent!= undefined && messageContent.startsWith("/endGame"))
    {
      if(Object.keys(state.players).includes(sender) && state.gameStarted)
      {
        state.gameStarted = false;
        state.players = new Object();
        writeTo(res, sourceChat, state.players[sender].username + " ha concluso la partita");
      }
      else
      {
        writeTo(res, sender , "Non c'è nessuna partita iniziata o non disponi dei diritti per terminare quella corrente");
      }
    }
    else
    {
      //default case
      writeTo(res, sourceChat, message);
    }
  }
});

function writeTo(res, toUser, messageText)
{
  // Respond by hitting the telegram bot API and responding to the approprite chat_id
  // Remember to use your own API toked instead of the one below  "https://api.telegram.org/bot<your_api_token>/sendMessage"
  const telegramAPI = 'https://api.telegram.org/bot' + telegramToken +'/sendMessage';
  axios
  .post(telegramAPI,
  {
    chat_id: toUser,
    text: messageText
  })
  .then((response) =>
  {
    // We get here if the message was successfully posted
    console.log('Message posted')
    res.end('ok')
  })
  .catch((err) =>
  {
    // ...and here if it was not
    console.log('Error :', err)
    res.end('Error :' + err)
  });
}

app.get("/", (req, res) =>
{
  res.send("Use this on Telegram!");
});

// Finally, start our server
app.listen(3000, function()
{
  console.log('Telegram app listening on port 3000!')
})