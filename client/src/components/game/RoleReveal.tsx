import { Role } from '../../types';
import { Timer } from './Timer';

interface RoleRevealProps {
  role: Role | null;
  timerRemaining: number;
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  MASTER: 'You know the secret word. Answer questions with Yes, No, or Maybe.',
  INSIDER: 'You know the secret word. Help others guess it without being discovered!',
  COMMON: 'Ask questions to figure out the secret word. Find the Insider!',
};

const ROLE_COLORS: Record<Role, string> = {
  MASTER: '#4CAF50',
  INSIDER: '#F44336',
  COMMON: '#2196F3',
};

export function RoleReveal({ role, timerRemaining }: RoleRevealProps) {
  if (!role) return null;

  return (
    <div className="role-reveal">
      <Timer seconds={timerRemaining} />
      <h2>Your Role</h2>
      <div
        className="role-card"
        style={{ borderColor: ROLE_COLORS[role] }}
      >
        <h3 style={{ color: ROLE_COLORS[role] }}>{role}</h3>
        <p>{ROLE_DESCRIPTIONS[role]}</p>
      </div>
      <p className="hint">Remember your role...</p>
    </div>
  );
}
