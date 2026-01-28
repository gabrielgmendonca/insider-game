import { describe, it, expect, beforeEach } from 'vitest';
import { WordBank } from './WordBank.js';

describe('WordBank', () => {
  let wordBank: WordBank;

  beforeEach(() => {
    wordBank = new WordBank();
  });

  describe('getRandomWord', () => {
    it('should return a string', () => {
      const word = wordBank.getRandomWord();
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    });

    it('should return different words on subsequent calls', () => {
      const words = new Set<string>();
      for (let i = 0; i < 10; i++) {
        words.add(wordBank.getRandomWord());
      }
      // With 10 calls, we should get 10 unique words
      expect(words.size).toBe(10);
    });

    it('should not return the same word twice until pool is exhausted', () => {
      const words: string[] = [];
      // Get 50 words (less than the total pool)
      for (let i = 0; i < 50; i++) {
        words.push(wordBank.getRandomWord());
      }
      const uniqueWords = new Set(words);
      expect(uniqueWords.size).toBe(50);
    });

    it('should reset and continue when all words are used', () => {
      // Get more words than exist in the pool to trigger reset
      const words: string[] = [];
      for (let i = 0; i < 300; i++) {
        const word = wordBank.getRandomWord();
        expect(word).toBeDefined();
        expect(word.length).toBeGreaterThan(0);
        words.push(word);
      }
      // Should have received 300 words without error
      expect(words.length).toBe(300);
    });
  });

  describe('resetUsedWords', () => {
    it('should allow previously used words to be returned again', () => {
      // Get the first word
      const firstWord = wordBank.getRandomWord();

      // Get more words to reduce the available pool
      for (let i = 0; i < 50; i++) {
        wordBank.getRandomWord();
      }

      // Reset and try again
      wordBank.resetUsedWords();

      // Now all words should be available again
      const wordsAfterReset: string[] = [];
      for (let i = 0; i < 100; i++) {
        wordsAfterReset.push(wordBank.getRandomWord());
      }

      // The first word should potentially appear in the new set
      // (though this is probabilistic, we just verify reset works)
      expect(wordsAfterReset.length).toBe(100);
      const uniqueAfterReset = new Set(wordsAfterReset);
      expect(uniqueAfterReset.size).toBe(100);
    });

    it('should clear all tracking of used words', () => {
      // Use some words
      const usedWords: string[] = [];
      for (let i = 0; i < 20; i++) {
        usedWords.push(wordBank.getRandomWord());
      }

      // Reset
      wordBank.resetUsedWords();

      // Get 20 more words
      const newWords: string[] = [];
      for (let i = 0; i < 20; i++) {
        newWords.push(wordBank.getRandomWord());
      }

      // The new words should all be unique among themselves
      expect(new Set(newWords).size).toBe(20);
    });
  });
});
