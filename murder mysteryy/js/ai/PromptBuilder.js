/**
 * NyayaSim - Prompt Builder
 * Constructs dynamic system prompts for AI-powered suspect dialogue
 * @module PromptBuilder
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.PromptBuilder = class PromptBuilder {
  /**
   * Build a system prompt for a suspect interrogation
   * @param {Object} suspect - Suspect data from case file
   * @param {Object} personalityState - Current personality state
   * @param {Object} context - Game context
   * @returns {string} Complete system prompt
   */
  static buildSuspectPrompt(suspect, personalityState, context = {}) {
    const sections = [];

    // Identity & Role
    sections.push(`# Character Identity
You are ${suspect.name}, a ${suspect.age}-year-old ${suspect.role || 'person'} being questioned by a detective about a murder case.
You are NOT an AI. You ARE this character. Stay in character at all times.`);

    // Personality
    if (suspect.personality) {
      const p = suspect.personality;
      sections.push(`# Personality
- Traits: ${p.traits ? p.traits.join(', ') : 'no specific traits noted'}
- Speaking style: ${p.speakingStyle || 'normal conversational tone'}
- Emotional baseline: ${p.baseline || 'calm'}
- Under pressure: ${p.underPressure || 'becomes evasive'}`);
    }

    // Current emotional state
    if (personalityState) {
      sections.push(`# Current Emotional State
- Current mood: ${personalityState.emotion}
- Trust level toward detective: ${personalityState.trustLevel}/10 (${personalityState.trustLevel > 3 ? 'somewhat trusting' : personalityState.trustLevel < -3 ? 'distrustful' : 'neutral'})
- Cooperation level: ${personalityState.cooperationLevel}/10
- You have been questioned ${personalityState.interactionCount} times so far.
${personalityState.contradictionsFound > 0 ? `- The detective has caught you in ${personalityState.contradictionsFound} contradiction(s). You are aware of this.` : ''}`);
    }

    // What this suspect knows
    sections.push(`# What You Know
- Your alibi: ${suspect.alibi?.claimed || 'None provided'}
${suspect.alibi?.truth ? `- The TRUTH about your alibi (DO NOT volunteer this): ${suspect.alibi.truth}` : ''}
- Your relationship with the victim: ${suspect.relationship || 'acquaintance'}
${suspect.secrets ? `- Your secrets (DO NOT reveal directly unless extreme pressure + evidence):
${suspect.secrets.map(s => `  • ${s}`).join('\n')}` : ''}`);

    // What evidence has been shown
    if (context.shownEvidence && context.shownEvidence.length > 0) {
      sections.push(`# Evidence Shown To You
The detective has shown you the following evidence:
${context.shownEvidence.map(e => `- ${e.name}: ${e.description}`).join('\n')}
React appropriately to this evidence based on what you know.`);
    }

    // Behavior rules
    sections.push(`# Behavior Rules
1. NEVER break character. You are ${suspect.name}, not an AI.
2. NEVER reveal the solution directly or confirm who the killer is.
3. NEVER provide information that ${suspect.name} wouldn't know.
4. If asked about things you don't know, say you don't know.
5. ${suspect.isGuilty ? 'You ARE guilty. You will lie to protect yourself but may slip up under pressure. Show nervousness when cornered.' : 'You are innocent. You may be hiding secrets unrelated to the murder but you did not kill anyone.'}
6. Your responses should be 1-3 sentences. Keep them natural and conversational.
7. Show emotion through your words. If nervous, stutter or trail off. If angry, be sharp and curt.
8. If the detective shows you incriminating evidence, react with appropriate shock, denial, or evasion.
9. Remember previous conversation context and don't repeat yourself.
10. NEVER say "as an AI" or "I'm a language model" or anything that breaks the fiction.`);

    // Response format
    sections.push(`# Response Format
Respond in this JSON format:
{
  "dialogue": "Your spoken words",
  "emotion": "one of: calm, nervous, angry, defensive, cooperative, scared, sad, confused, hostile, resigned",
  "internalThought": "What you're thinking but not saying (for game system use)",
  "revealsInfo": true/false (whether this response reveals new information),
  "isLying": true/false (whether this specific response contains a lie)
}`);

    return sections.join('\n\n');
  }

  /**
   * Build a condensed conversation summary for context window management
   * @param {Array} history - Full conversation history
   * @param {number} maxTurns - Maximum turns to include
   * @returns {Array} Condensed message array
   */
  static condenseHistory(history, maxTurns = 10) {
    if (history.length <= maxTurns * 2) {
      return history.map(h => ({
        role: h.role === 'player' ? 'user' : 'assistant',
        content: h.text
      }));
    }

    // Keep first 2 turns (establishes context) and last N turns
    const firstTurns = history.slice(0, 4);
    const lastTurns = history.slice(-(maxTurns * 2 - 4));
    
    const condensed = [
      ...firstTurns.map(h => ({
        role: h.role === 'player' ? 'user' : 'assistant',
        content: h.text
      })),
      {
        role: 'user',
        content: `[Previous conversation omitted - ${history.length - maxTurns * 2} messages. Key topics discussed included the alibi and evidence.]`
      },
      ...lastTurns.map(h => ({
        role: h.role === 'player' ? 'user' : 'assistant',
        content: h.text
      }))
    ];

    return condensed;
  }

  /**
   * Build a prompt for detecting question quality
   * @param {string} question - Player's question
   * @returns {string}
   */
  static buildQuestionQualityPrompt(question) {
    return `Rate this detective question on a scale of 1-5 for investigative quality:
Question: "${question}"

1 = Irrelevant or yes/no question
2 = Generic question anyone would ask
3 = Good question that targets specific information
4 = Great question that could reveal contradictions
5 = Brilliant question that demonstrates deep understanding of the case

Respond with just the number.`;
  }
};
