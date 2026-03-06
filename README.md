# ⚔ Board Game Engine

A **peer-to-peer multiplayer board game engine** for GitHub Pages. No server required — players connect directly via WebRTC link sharing.

## 🎮 Live Demo
→ [Your GitHub Pages URL here]

## 🚀 Deploy to GitHub Pages (5 minutes)

1. **Fork or upload** this repo to GitHub
2. Go to **Settings → Pages → Source → main branch / root**
3. Your site will be live at `https://USERNAME.github.io/REPO-NAME/`

That's it. No backend, no server costs, no setup.

---

## 🏗 How It Works

```
Player A (Host)          Player B (Guest)
     │                        │
     │  Creates room          │
     │  ──────────────────►  │  Joins via link
     │                        │
     │  Receives action       │  Sends action
     │  Validates state  ◄──  │
     │  Broadcasts state ──►  │
     │                        │
  (Source of truth)        (Renders state)
```

- **P2P via PeerJS**: No server needed. Uses WebRTC with a free public STUN server.
- **Host = Authority**: The host validates all actions. Guests send actions, receive state.
- **Works on GitHub Pages**: Fully static — HTML, CSS, JS only.

---

## 🎲 Adding Your Own Game

Create a file in `js/games/YOUR-GAME.js` following this template:

```javascript
const MyGame = {
  name: 'My Game',
  description: 'A great game',
  icon: '🎲',
  minPlayers: 2,
  maxPlayers: 4,

  /**
   * Called once when game starts.
   * @param {Array} players - [{id, name, color}, ...]
   * @returns {Object} initial game state
   */
  createInitialState(players) {
    return {
      phase: 'PLAY',
      currentPlayer: players[0].id,
      players,
      // ... your state
    };
  },

  /**
   * Called by host to process an action.
   * @param {Object} state - deep clone of current state
   * @param {Object} action - {type, playerId, ...data}
   * @returns {{ valid: boolean, newState: Object, log?: string, reason?: string }}
   */
  processAction(state, action) {
    const { type, playerId } = action;
    
    switch (type) {
      case 'MY_ACTION':
        // validate
        if (state.currentPlayer !== playerId)
          return { valid: false, reason: 'Not your turn' };
        
        // mutate state
        state.someField = action.data;
        
        return { valid: true, newState: state, log: `Player did something` };
      
      default:
        return { valid: false, reason: `Unknown action: ${type}` };
    }
  },

  /**
   * @returns {Object|null} winning player object, or null if game continues
   */
  checkWinCondition(state) {
    // return state.players.find(p => p.score >= 100) || null;
    return null;
  },

  /**
   * Render the game into the container.
   * Re-called on every state update.
   * Use engine.submitAction({ type, ...data }) to trigger actions.
   * 
   * @param {Object} state
   * @param {HTMLElement} container
   * @param {BoardGameEngine} engine
   */
  render(state, container, engine) {
    container.innerHTML = `
      <div>
        <h2>Current player: ${state.currentPlayer}</h2>
        <button onclick="engine.submitAction({ type: 'MY_ACTION', data: 42 })">
          Do something
        </button>
      </div>
    `;
  }
};

// Register the game
window.GAMES = window.GAMES || {};
window.GAMES['my-game'] = MyGame;
```

Then:
1. Add a `<script src="js/games/my-game.js">` tag in `index.html` and `play.html`
2. Add your game to the `GAME_LIST` array in `index.html`

---

## 🛠 Engine API Reference

### `engine.submitAction(action)`
Submit a player action. If host, processes immediately. If guest, sends to host.
```js
engine.submitAction({ type: 'PLACE_PIECE', row: 2, col: 3 });
```

### `engine.rollDice(sides, count)`
Returns array of dice rolls. Only call from `processAction` (host) for fairness.
```js
const [d1, d2] = engine.rollDice(6, 2); // roll 2d6
```

### `engine.shuffleDeck(cards)`
Returns shuffled copy of array.
```js
const deck = engine.shuffleDeck(myCards);
```

### `engine.on(event, fn)`
Listen to engine events.
```js
engine.on('gameover', winner => alert(`${winner.name} wins!`));
engine.on('log', entry => console.log(entry.msg));
engine.on('invalid-action', result => showError(result.reason));
```

---

## 📁 File Structure

```
/
├── index.html              ← Lobby (create/join room)
├── play.html               ← Game room
├── css/
│   └── style.css           ← All styles
├── js/
│   ├── engine.js           ← Core game engine
│   ├── network.js          ← PeerJS P2P layer
│   └── games/
│       ├── territory-wars.js   ← Demo game
│       └── YOUR-GAME.js        ← Your game here
└── README.md
```

---

## 🎮 Included Demo: Territory Wars

A simplified Risk-inspired game:
- **2–4 players** on a 7-territory map
- **Reinforce** territories each turn
- **Attack** neighbors with dice rolls
- **Win** by controlling all territories

---

## 📦 Dependencies (CDN, no install needed)

- [PeerJS 1.5.4](https://peerjs.com/) — WebRTC peer-to-peer
- Google Fonts (Cinzel + Crimson Pro) — Typography

---

## 🔧 Local Development

Just open `index.html` in a browser. For P2P to work between two windows, both need internet access (PeerJS uses its public signaling server).

```bash
# Optional: serve locally
npx serve .
# or
python3 -m http.server 8080
```

---

## License

MIT — use freely for your own board game projects.
