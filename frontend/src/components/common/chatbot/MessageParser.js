class MessageParser {
  constructor(actionProvider) {
    this.actionProvider = actionProvider;
  }

  parse(message) {
    const lower = String(message || '').toLowerCase();

    if (!lower.trim()) {
      this.actionProvider.handleGeneralHelp();
      return;
    }

    if (/\b(hi|hello|hey)\b/.test(lower)) {
      this.actionProvider.handleGreeting();
      return;
    }

    if (/\b(admin|secret|revenue|payouts|transactions|finance|dashboard stats)\b/.test(lower)) {
      this.actionProvider.handlePrivacyBoundary();
      return;
    }

    if (/\b(my tasks|task status|status|progress|active task|tasks)\b/.test(lower)) {
      this.actionProvider.handleMyTasks();
      return;
    }

    if (/\b(next|what next|next step|what should i do|step)\b/.test(lower)) {
      this.actionProvider.handleNextStep();
      return;
    }

    if (/\b(pay|payment|money|checkout)\b/.test(lower)) {
      this.actionProvider.handlePayments();
      return;
    }

    if (/\b(guide|walker|traveler|walkee|map|location|assign|activate|approval)\b/.test(lower)) {
      this.actionProvider.handleGuideTravelerTips();
      return;
    }

    this.actionProvider.handleGeneralHelp();
  }
}

export default MessageParser;
