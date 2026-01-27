const WORDS = [
  // Animals
  'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'kangaroo', 'octopus', 'flamingo',
  'cheetah', 'peacock', 'hamster', 'crocodile', 'lobster', 'parrot', 'jellyfish', 'hedgehog',

  // Food & Drinks
  'pizza', 'sushi', 'hamburger', 'chocolate', 'pancake', 'avocado', 'popcorn', 'watermelon',
  'coffee', 'lemonade', 'sandwich', 'spaghetti', 'cheesecake', 'burrito', 'pretzel', 'milkshake',

  // Objects
  'umbrella', 'telescope', 'backpack', 'headphones', 'microwave', 'keyboard', 'scissors', 'candle',
  'calendar', 'envelope', 'notebook', 'flashlight', 'toothbrush', 'sunglasses', 'briefcase', 'thermometer',

  // Places
  'hospital', 'airport', 'library', 'museum', 'restaurant', 'stadium', 'lighthouse', 'castle',
  'aquarium', 'theater', 'pharmacy', 'bakery', 'cemetery', 'factory', 'warehouse', 'monastery',

  // Nature
  'volcano', 'waterfall', 'rainbow', 'tornado', 'glacier', 'desert', 'canyon', 'forest',
  'mountain', 'island', 'river', 'ocean', 'sunset', 'moonlight', 'thunderstorm', 'avalanche',

  // Professions
  'astronaut', 'detective', 'firefighter', 'architect', 'scientist', 'musician', 'photographer', 'journalist',
  'carpenter', 'electrician', 'veterinarian', 'lifeguard', 'mechanic', 'librarian', 'dentist', 'pilot',

  // Sports & Games
  'basketball', 'skateboard', 'volleyball', 'surfing', 'bowling', 'archery', 'gymnastics', 'marathon',
  'snowboard', 'trampoline', 'badminton', 'wrestling', 'karate', 'billiards', 'dodgeball', 'fencing',

  // Transportation
  'helicopter', 'submarine', 'motorcycle', 'sailboat', 'ambulance', 'firetruck', 'tractor', 'scooter',
  'spaceship', 'limousine', 'skateboard', 'rickshaw', 'gondola', 'airplane', 'bicycle', 'canoe',

  // Clothing
  'sweater', 'necktie', 'sandals', 'bathrobe', 'overalls', 'tuxedo', 'raincoat', 'pajamas',
  'bracelet', 'necklace', 'earrings', 'wristwatch', 'backpack', 'handbag', 'mittens', 'bandana',

  // Entertainment
  'concert', 'carnival', 'fireworks', 'magician', 'juggler', 'comedian', 'orchestra', 'ballet',
  'karaoke', 'parade', 'festival', 'circus', 'rollercoaster', 'ferriswheel', 'puppetshow', 'acrobat',

  // Technology
  'smartphone', 'television', 'computer', 'satellite', 'robot', 'internet', 'camera', 'printer',
  'battery', 'antenna', 'projector', 'calculator', 'microphone', 'earbuds', 'smartwatch', 'tablet',

  // Household
  'refrigerator', 'dishwasher', 'fireplace', 'chandelier', 'staircase', 'bathtub', 'doorbell', 'curtains',
  'pillowcase', 'blanket', 'lampshade', 'bookshelf', 'wardrobe', 'mailbox', 'trashcan', 'hammock',

  // Concepts & Abstract
  'birthday', 'vacation', 'wedding', 'adventure', 'mystery', 'surprise', 'celebration', 'tradition',
  'nightmare', 'daydream', 'memory', 'promise', 'secret', 'treasure', 'discovery', 'imagination',

  // Miscellaneous
  'pirate', 'wizard', 'mermaid', 'vampire', 'zombie', 'superhero', 'ninja', 'knight',
  'dinosaur', 'unicorn', 'dragon', 'alien', 'ghost', 'fairy', 'giant', 'werewolf'
];

export class WordBank {
  private usedWords: Set<string> = new Set();

  getRandomWord(): string {
    const availableWords = WORDS.filter(word => !this.usedWords.has(word));

    if (availableWords.length === 0) {
      this.usedWords.clear();
      return this.getRandomWord();
    }

    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    this.usedWords.add(word);
    return word;
  }

  resetUsedWords(): void {
    this.usedWords.clear();
  }
}

export const wordBank = new WordBank();
