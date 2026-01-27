import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Timer } from './Timer';
import { Question } from '../../types';

export function QuestionPhase() {
  const { room, isMaster, askQuestion, answerQuestion, guessWord, approveGuess, secretWord } = useGame();
  const [questionText, setQuestionText] = useState('');
  const [guessText, setGuessText] = useState('');
  const [showGuess, setShowGuess] = useState(false);
  const questionsEndRef = useRef<HTMLDivElement>(null);

  const gameState = room?.gameState;
  const questions = gameState?.questions || [];

  useEffect(() => {
    questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions.length]);

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim() && !isMaster) {
      askQuestion(questionText.trim());
      setQuestionText('');
    }
  };

  const handleGuessWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessText.trim() && !isMaster) {
      guessWord(guessText.trim());
      setGuessText('');
      setShowGuess(false);
    }
  };

  const handleAnswer = (questionId: string, answer: 'YES' | 'NO' | 'I_DONT_KNOW') => {
    answerQuestion(questionId, answer);
  };

  const unansweredQuestion = questions.find(q => q.answer === null && !q.isGuess);
  const pendingGuess = questions.find(q => q.isGuess && q.pendingMasterApproval);

  const handleApproveGuess = (questionId: string, approved: boolean) => {
    approveGuess(questionId, approved);
  };

  return (
    <div className="question-phase">
      <div className="phase-header">
        <Timer seconds={gameState?.timerRemaining || 0} />
        <h2>Question Phase</h2>
        {isMaster && secretWord && (
          <div className="master-word">
            Secret Word: <strong>{secretWord}</strong>
          </div>
        )}
      </div>

      <div className="questions-container">
        <div className="questions-list">
          {questions.length === 0 ? (
            <p className="no-questions">No questions yet. Start asking!</p>
          ) : (
            questions.map((q) => (
              <QuestionItem
                key={q.id}
                question={q}
              />
            ))
          )}
          <div ref={questionsEndRef} />
        </div>
      </div>

      {!isMaster && (
        <div className="input-section">
          {showGuess ? (
            <form onSubmit={handleGuessWord} className="guess-form">
              <input
                type="text"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
                placeholder="Enter your guess..."
                autoFocus
              />
              <button type="submit" disabled={!guessText.trim()}>
                Guess
              </button>
              <button type="button" onClick={() => setShowGuess(false)} className="secondary">
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleAskQuestion} className="question-form">
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ask a yes/no question..."
                disabled={!!unansweredQuestion}
              />
              <button type="submit" disabled={!questionText.trim() || !!unansweredQuestion}>
                Ask
              </button>
              <button type="button" onClick={() => setShowGuess(true)} className="guess-button">
                Guess Word
              </button>
            </form>
          )}
        </div>
      )}

      {isMaster && pendingGuess && (
        <div className="master-answer-section guess-approval">
          <p>
            <strong>{pendingGuess.playerName}</strong> guessed: "<strong>{pendingGuess.guessedWord}</strong>"
          </p>
          <p>Is this correct?</p>
          <div className="answer-buttons">
            <button onClick={() => handleApproveGuess(pendingGuess.id, true)} className="yes">
              Correct
            </button>
            <button onClick={() => handleApproveGuess(pendingGuess.id, false)} className="no">
              Incorrect
            </button>
          </div>
        </div>
      )}

      {isMaster && unansweredQuestion && !pendingGuess && (
        <div className="master-answer-section">
          <p>Answer the question:</p>
          <div className="answer-buttons">
            <button onClick={() => handleAnswer(unansweredQuestion.id, 'YES')} className="yes">
              Yes
            </button>
            <button onClick={() => handleAnswer(unansweredQuestion.id, 'NO')} className="no">
              No
            </button>
            <button onClick={() => handleAnswer(unansweredQuestion.id, 'I_DONT_KNOW')} className="i-dont-know">
              I Don't Know
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionItemProps {
  question: Question;
}

function QuestionItem({ question }: QuestionItemProps) {
  const isGuess = question.isGuess;
  const isPending = question.pendingMasterApproval;
  const answerClass = isPending ? 'pending-approval' : (question.answer?.toLowerCase().replace(/_/g, '-') || 'pending');
  const displayAnswer = question.answer === 'I_DONT_KNOW' ? "I Don't Know" : question.answer;

  return (
    <div className={`question-item ${isGuess ? 'guess' : ''} ${answerClass}`}>
      <div className="question-header">
        <span className="player-name">{question.playerName}</span>
        {isGuess && <span className="guess-badge">GUESS</span>}
        {isPending && <span className="pending-badge">Awaiting Master</span>}
      </div>
      <div className="question-text">{question.text}</div>
      {question.answer && (
        <div className={`question-answer ${answerClass}`}>
          {displayAnswer}
        </div>
      )}
    </div>
  );
}
