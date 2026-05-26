import { createChatBotMessage } from 'react-chatbot-kit';

const botName = 'Voya Assistant';

const createRoleLabel = (role) => {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'walker') return 'guide';
  if (normalized === 'walkee') return 'traveler';
  return 'user';
};

const createChatbotConfig = (user) => {
  const currentRole = String(user?.role || '').toLowerCase();
  const roleLabel = createRoleLabel(currentRole);

  return {
    botName,
    initialMessages: [
      createChatBotMessage(
        `Hi! I can help with ${roleLabel} task updates only. Ask: "my tasks", "next step", or "payment status".`
      )
    ],
    state: {
      currentUserId: user?.id || null,
      currentRole
    },
    customStyles: {
      botMessageBox: {
        backgroundColor: '#4A90E2'
      },
      chatButton: {
        backgroundColor: '#4A90E2'
      }
    }
  };
};

export default createChatbotConfig;
