import express from 'express';
import { v4 as uuid } from 'uuid';
import * as ai from '../services/claudeService.js';

const router = express.Router();
export const rooms = new Map();

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function roomSummary(room) {
  return {
    id: room.id,
    caseData: room.caseData,
    started: room.started,
    createdAt: room.createdAt,
    seats: room.seats,
    messages: room.messages
  };
}

function addMessage(room, type, speaker, content, extra = {}) {
  room.messages.push({
    id: `${Date.now()}-${Math.random()}`,
    type,
    speaker,
    content,
    time: nowTime(),
    ...extra
  });
}

function genericJudgeOpening(caseData) {
  return `The Court takes up ${caseData.title}. Counsel will proceed with discipline, cite the record, and confine submissions to the issues arising in ${caseData.caseNumber}.`;
}

function simpleOfflineCounter(room, seat) {
  if (seat === 'prosecution') {
    return room.caseData.defenseArguments?.[room.messages.length % (room.caseData.defenseArguments?.length || 1)]
      || 'The defense submits that the prosecution has not discharged its burden beyond reasonable doubt.';
  }
  return room.caseData.prosecutionArguments?.[room.messages.length % (room.caseData.prosecutionArguments?.length || 1)]
    || 'The prosecution relies on the material on record and submits that the ingredients of the offence stand proved.';
}

async function maybeGenerateAIResponse(room, triggeringSeat, latestMessage) {
  const history = room.messages
    .filter((message) => message.type !== 'sys')
    .slice(-6)
    .map((message) => ({ role: message.type === 'judge' ? 'assistant' : 'user', content: `${message.speaker}: ${message.content}` }));

  if (triggeringSeat === 'prosecution' || triggeringSeat === 'defense') {
    const oppositeSeat = triggeringSeat === 'prosecution' ? 'defense' : 'prosecution';

    if (!room.seats[oppositeSeat]) {
      let response = simpleOfflineCounter(room, triggeringSeat);
      try {
        response = await ai.aiLawyerRespond(
          room.caseData.title,
          room.caseData.summary,
          history,
          latestMessage,
          oppositeSeat
        );
      } catch {}
      addMessage(room, oppositeSeat, `AI ${oppositeSeat === 'prosecution' ? 'Prosecution' : 'Defense'}`, response);
    }

    if (!room.seats.judge) {
      let response = genericJudgeOpening(room.caseData);
      try {
        response = await ai.judgeRespond(history, `Counsel has submitted: "${latestMessage}". The court should briefly respond and steer the case forward.`);
      } catch {}
      addMessage(room, 'judge', 'AI Judge', response);
    }
  }
}

router.post('/create', (req, res) => {
  const { caseData } = req.body;
  if (!caseData) return res.status(400).json({ success: false, error: 'Case data is required' });

  const room = {
    id: uuid().slice(0, 6).toUpperCase(),
    createdAt: new Date().toISOString(),
    started: false,
    caseData,
    seats: {
      judge: null,
      prosecution: null,
      defense: null,
      observer: []
    },
    messages: []
  };

  rooms.set(room.id, room);
  res.status(201).json({ success: true, room: roomSummary(room) });
});

router.get('/:id', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
  res.json({ success: true, room: roomSummary(room) });
});

router.post('/:id/join', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  const { seat, participantName } = req.body;
  if (!seat || !participantName) return res.status(400).json({ success: false, error: 'Seat and participant name are required' });

  if (seat === 'observer') {
    if (!room.seats.observer.includes(participantName)) room.seats.observer.push(participantName);
  } else if (room.seats[seat] && room.seats[seat] !== participantName) {
    return res.status(409).json({ success: false, error: 'Seat already occupied' });
  } else {
    room.seats[seat] = participantName;
  }

  addMessage(room, 'sys', 'Court', `${participantName} joined the room as ${seat}.`);
  res.json({ success: true, room: roomSummary(room) });
});

router.post('/:id/start', async (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  if (!room.started) {
    room.started = true;
    addMessage(room, 'sys', 'Court', `The Court is now in session.`);
    addMessage(room, 'sys', 'Court', `Case: ${room.caseData.title} · ${room.caseData.caseNumber}`);

    if (!room.seats.judge) {
      let opening = genericJudgeOpening(room.caseData);
      try {
        opening = await ai.judgeRespond([], `Open proceedings for ${room.caseData.title}. The available human seats are: ${JSON.stringify(room.seats)}.`);
      } catch {}
      addMessage(room, 'judge', 'AI Judge', opening);
    }
  }

  res.json({ success: true, room: roomSummary(room) });
});

router.post('/:id/turn', async (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  const { seat, participantName, message } = req.body;
  if (!seat || !participantName || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'Seat, participant name, and message are required' });
  }

  addMessage(room, seat, participantName, message.trim());
  await maybeGenerateAIResponse(room, seat, message.trim());

  res.json({ success: true, room: roomSummary(room) });
});

router.post('/:id/judgment', async (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  const prosPoints = room.messages.filter((message) => message.type === 'prosecution').map((message) => message.content);
  const defPoints = room.messages.filter((message) => message.type === 'defense').map((message) => message.content);

  let judgment = `The Court reserves judgment in ${room.caseData.title}.`;
  try {
    judgment = await ai.deliverJudgment(room.caseData.title, prosPoints, defPoints);
  } catch {}

  addMessage(room, 'judge', room.seats.judge || 'AI Judge', judgment);
  res.json({ success: true, room: roomSummary(room), judgment });
});

export default router;
