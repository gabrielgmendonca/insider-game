import { useGame } from '../context/GameContext';
import {
  RoleReveal,
  WordReveal,
  QuestionPhase,
  DiscussionPhase,
  InitialVotePhase,
  VotingPhase,
  ResultsScreen,
} from '../components/game';

export function GamePage() {
  const { room, myRole, secretWord } = useGame();

  if (!room) return null;

  const { phase, timerRemaining } = room.gameState;

  switch (phase) {
    case 'ROLE_REVEAL':
      return <RoleReveal role={myRole} timerRemaining={timerRemaining} />;

    case 'WORD_REVEAL':
      return (
        <WordReveal
          role={myRole}
          secretWord={secretWord}
          timerRemaining={timerRemaining}
        />
      );

    case 'QUESTION':
      return <QuestionPhase />;

    case 'DISCUSSION':
      return <DiscussionPhase />;

    case 'INITIAL_VOTE':
      return <InitialVotePhase />;

    case 'VOTING':
      return <VotingPhase />;

    case 'RESULTS':
      return <ResultsScreen />;

    default:
      return <div>Unknown phase: {phase}</div>;
  }
}
