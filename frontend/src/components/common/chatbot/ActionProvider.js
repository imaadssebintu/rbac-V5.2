import { taskAPI } from '../../../services/api.js';

class ActionProvider {
  constructor(createChatBotMessage, setStateFunc, createClientMessage, stateRef) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.stateRef = stateRef;
  }

  addMessageToState(message) {
    this.setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }

  getUserContext() {
    const state = this.stateRef?.current || {};
    return {
      userId: state.currentUserId,
      role: String(state.currentRole || '').toLowerCase()
    };
  }

  filterOwnTasks(tasks, userId, role) {
    if (!userId) return [];
    if (role === 'walker') {
      return tasks.filter((task) => String(task.walker_id) === String(userId));
    }
    if (role === 'walkee') {
      return tasks.filter((task) => String(task.walkee_id) === String(userId));
    }
    return [];
  }

  async fetchOwnTasks() {
    const { userId, role } = this.getUserContext();
    if (!userId || !['walker', 'walkee'].includes(role)) {
      return { role, tasks: [], unavailable: true };
    }

    const response = await taskAPI.getAll();
    const allTasks = response.data?.tasks || response.data || [];
    return {
      role,
      tasks: this.filterOwnTasks(allTasks, userId, role),
      unavailable: false
    };
  }

  handlePayments() {
    const message = this.createChatBotMessage(
      'For your own tasks: complete traveler checkout when prompted, and watch task status move from pending to assigned to in progress.'
    );
    this.addMessageToState(message);
  }

  handleGuideTravelerTips() {
    const message = this.createChatBotMessage(
      'Guide and traveler tips: keep location on, check map markers, and follow task status updates so pickup and handoff stay smooth.'
    );
    this.addMessageToState(message);
  }

  handlePrivacyBoundary() {
    const message = this.createChatBotMessage(
      'I can only share common guide/traveler task info. Admin finance and secret dashboard data are not available in this chat.'
    );
    this.addMessageToState(message);
  }

  async handleMyTasks() {
    try {
      const { role, tasks, unavailable } = await this.fetchOwnTasks();

      if (unavailable) {
        this.addMessageToState(this.createChatBotMessage('Sign in as a guide or traveler to get your personal task updates.'));
        return;
      }

      const active = tasks.filter((task) => ['pending', 'assigned', 'in_progress'].includes(task.status));
      const completed = tasks.filter((task) => task.status === 'completed').length;
      const cancelled = tasks.filter((task) => task.status === 'cancelled').length;
      const roleLabel = role === 'walker' ? 'guide' : 'traveler';

      const text = active.length === 0
        ? `No active ${roleLabel} tasks right now. Completed: ${completed}, Cancelled: ${cancelled}.`
        : `You have ${active.length} active task(s). Completed: ${completed}, Cancelled: ${cancelled}. Latest status: ${active[0].status}.`;

      this.addMessageToState(this.createChatBotMessage(text));
    } catch (error) {
      this.addMessageToState(this.createChatBotMessage('I could not load your tasks right now. Please try again in a moment.'));
    }
  }

  async handleNextStep() {
    try {
      const { role, tasks, unavailable } = await this.fetchOwnTasks();

      if (unavailable) {
        this.addMessageToState(this.createChatBotMessage('Sign in first, then ask for your next task step.'));
        return;
      }

      const active = tasks.find((task) => ['pending', 'assigned', 'in_progress'].includes(task.status));
      if (!active) {
        this.addMessageToState(this.createChatBotMessage('No active task now. You are clear until a new task appears.'));
        return;
      }

      if (role === 'walkee') {
        if (active.status === 'pending' && !active.is_approved) {
          this.addMessageToState(this.createChatBotMessage('Next step: wait for admin approval, then proceed with payment when prompted.'));
          return;
        }

        if (active.status === 'assigned') {
          this.addMessageToState(this.createChatBotMessage('Next step: your guide is assigned. Keep location enabled and monitor map ETA.'));
          return;
        }

        if (active.status === 'in_progress') {
          this.addMessageToState(this.createChatBotMessage('Next step: stay reachable while your guide is in progress, then submit feedback after completion.'));
          return;
        }
      }

      if (role === 'walker') {
        if (active.status === 'assigned') {
          this.addMessageToState(this.createChatBotMessage('Next step: open your dashboard map, head to pickup, then start the task when near the traveler.'));
          return;
        }

        if (active.status === 'in_progress') {
          this.addMessageToState(this.createChatBotMessage('Next step: continue tracking, complete the trip, and request traveler feedback.'));
          return;
        }
      }

      this.addMessageToState(this.createChatBotMessage(`Current task status is ${active.status}. Keep following dashboard prompts.`));
    } catch (error) {
      this.addMessageToState(this.createChatBotMessage('I could not determine your next step right now. Please try again shortly.'));
    }
  }

  handleGeneralHelp() {
    const message = this.createChatBotMessage(
      'Try asking: "my tasks", "next step", "payment status", or "map tips". I only show guide/traveler task info.'
    );
    this.addMessageToState(message);
  }

  handleGreeting() {
    const message = this.createChatBotMessage('Hello! What would you like to do in Voya?');
    this.addMessageToState(message);
  }
}

export default ActionProvider;
