const Player = require('./Player.js').Player;
const deepClone = require("lodash.clonedeep");

// game constructor

Game.games = [];
Game.codes = [];
Game.publicGames = [];

function Game() {
	this.constructor = Game;
	this.dateOpened = new Date();
	this.day = 1;
	this.players = [];
	this.passwords = [];
	this.connections = [];
	this.chat = [];
	this.bannedIps = [];
	this.inGame = false;
	this.gameEnded = false;
	this.settings = {		
		allowPlayersToJoin: true,
		public: false
	}

	// pushes game to static game.games
	Game.games.push(this);

	// generates code
	while (!this.code || Game.codes.includes(this.code)) {
		this.code = Math.round(Math.random() * (999999 - 111111) + 111111);
		this.code = this.code.toString();
	}

	// adds code to list
	Game.codes.push(this.code);

	// join function
	this.join = function(name) {
		// checks if players are allowed to join right now
		if(!this.settings.allowPlayersToJoin){
			return {
					failed: true,
					reason: "This game is not allowing new players to join right now."
				}
		}

		// checks if name is taken
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].name == name) {
				return {
					failed: true,
					reason: "That username is already taken."
				}
			}
		}

		// generates player
		let player = new Player(name, this);
		player.game = this;
		this.players.push(player);
		this.passwords.push(player.password);

		return player;
	}

	// start game function
	this.startGame = function(player) {
		// removes game from public list
		if (Game.publicGames.includes(this)) Game.publicGames.splice(Game.games.indexOf(this), 1);

		this.chat = [];
		this.sendMessage({
			action: "clearChat"
		});

		// tells players game started
		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				date: new Date().toString(),
				message: `${player.name} has started the game.`
			}]
		});

		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				date: new Date().toString(),
				message: "So this is where the game starts. Very cool."
			}]
		});

			// changes day phase in 10 seconds
			setTimeout(() => {
				this.changeDayPhase();
			}, 10000); // 10000 milliseconds = 10 seconds
	}

	this.sendMessage = function(message) {
		// adds message to chat list if applicable
		if (message.action == "recieveMessage") {
			this.chat = this.chat.concat(message.messages);
		}

		// loops through all websockets
		for (let i = 0; i < this.connections.length; i++) {
			if (message.action == "recieveMessage") {
				// checks if any messages are to be sent
				if (message.messages.length > 0) {
					this.connections[i].sendUTF(JSON.stringify(message));
				}
			} else {
				this.connections[i].sendUTF(JSON.stringify(message));
			}
		}
	}

	this.endGame = function(skipWait = false, alert = true) {
		this.gameEnded = true;

		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				date: new Date().toString(),
				message: "This game is now over. The game room will automatically close in 10 minutes. You can leave before then, if you wish, by pressing the \"Leave Game\" button at the top of the screen. Thank you for playing.",
			}]
		});

		// closes game in five minutes
		setTimeout(() => {
			// kicks out players from frontend
			if(alert){
				this.sendMessage({
					action: "gameClosed",
					message: "This game was closed since it has been over for 10 minutes. Thank you for playing."
				});
			}

			// clears game data
			let index = Game.codes.indexOf(this.code);
			Game.codes.splice(index, 1);
			Game.games.splice(index, 1);
			if (Game.publicGames.includes(this)) Game.publicGames.splice(index, 1);
		}, skipWait ? 0 : 600000); // 600000 milliseconds = 10 minutes
	}

	// closes game if inactive
	setTimeout(() => {
		if (this.inGame == false) {
			this.sendMessage({
				action: "gameClosed",
				message: "This game was closed since it has been open for 15 minutes without starting."
			});

			// clears game data
			let index = Game.codes.indexOf(this.code);
			Game.codes.splice(index, 1);
			Game.games.splice(index, 1);
			if (Game.publicGames.includes(this)) Game.publicGames.splice(index, 1);
		}
	}, 900000); // 900000 milliseconds = 15 minutes
}

// exports game constructor
module.exports = {
	Game
}