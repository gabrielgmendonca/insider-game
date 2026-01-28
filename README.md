# Insider Game

A multiplayer web-based implementation of [Insider](https://oinkgames.com/en/games/analog/insider/), the social deduction party game by Oink Games.

## About the Game

**Insider** combines a quiz game with hidden roles. Players must guess a secret word by asking yes/no questions to the Master within a time limit. The twist: one player (the Insider) secretly knows the answer and tries to guide others toward it without being discovered.

| Players | Time   |
|---------|--------|
| 4-8     | ~15 min |

### Roles

| Role | Knows the Word | Goal |
|------|----------------|------|
| **Master** | Yes | Answer questions honestly. Help identify the Insider. |
| **Insider** | Yes | Guide others to the answer without being discovered. |
| **Commons** | No | Guess the word and identify the Insider. |

### Winning Conditions

| Condition | Winner |
|-----------|--------|
| Word guessed AND Insider correctly identified | Commons & Master |
| Word guessed BUT Insider NOT identified | Insider |
| Time runs out without guessing the word | Insider |

See [RULES.md](RULES.md) for complete game rules.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, Express, Socket.io
- **Testing:** Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/gabrielgmendonca/insider-game.git
cd insider-game

# Install dependencies
npm install
```

### Development

```bash
# Start both server and client in development mode
npm run dev
```

- Client runs at http://localhost:3000
- Server runs at http://localhost:4000

### Production Build

```bash
# Build both server and client
npm run build

# Start the server
npm start
```

### Testing

```bash
# Run tests
npm test -w server

# Run tests with coverage
npm run test:coverage -w server
```

## Project Structure

```
insider-game/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Game phase components
│       ├── context/        # Socket and game state management
│       └── pages/          # Home, Lobby, Game pages
├── server/                 # Express + Socket.io backend
│   └── src/
│       ├── game/           # Game logic (GameManager, RoomManager, etc.)
│       ├── socket/         # Socket event handlers
│       └── types/          # TypeScript interfaces
└── RULES.md               # Complete game rules
```

## How to Play

1. **Create or Join a Room** - One player creates a room and shares the 4-letter code
2. **Wait for Players** - 4-8 players must join before starting
3. **Start the Game** - The host starts when ready
4. **Role Reveal** - Each player secretly sees their role
5. **Word Reveal** - Master and Insider see the secret word
6. **Question Phase** (5 min) - Ask yes/no questions, try to guess the word
7. **Discussion** (5 min) - Discuss who might be the Insider
8. **Voting** - Vote on who the Insider is
9. **Results** - See who won!

## License

This is a fan-made digital implementation. Insider is a trademark of Oink Games.
