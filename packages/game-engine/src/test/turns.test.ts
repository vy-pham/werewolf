import { describe, expect, it } from 'vitest';
import { projectFor } from '../projection';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

describe('discussion speaking turns', () => {
  it('gives every living player one turn in seat order, then starts the vote', () => {
    const h = new Harness();
    h.night({ kill: 'p3' });
    h.advanceTo('DISCUSSION');
    expect(h.state.day.speakerOrder).toEqual(['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8']);

    const speakers: string[] = [];
    while (h.phase === 'DISCUSSION') {
      speakers.push(h.eventsOfType('SPEAKER_CHANGED').at(-1)?.payload.speakerId ?? '?');
      h.timeout();
    }
    expect(speakers).toEqual(['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8']);
    expect(h.phase).toBe('VOTE');
  });

  it('each turn lasts speakingSeconds', () => {
    const h = new Harness(undefined, { timers: { speakingSeconds: 45 } });
    h.night({});
    h.advanceTo('DISCUSSION');
    const changed = h.eventsOfType('SPEAKER_CHANGED').at(-1)?.payload;
    expect(changed).toMatchObject({ speakerId: 'p1', turn: 1, total: 8 });
    expect(h.state.phase.endsAt - h.now).toBe(45_000);
  });

  it('rotates the first speaker every day', () => {
    const h = new Harness();
    h.night({});
    h.advanceTo('DISCUSSION');
    expect(h.state.day.speakerOrder[0]).toBe('p1');
    h.night({});
    h.advanceTo('DISCUSSION');
    expect(h.state.day.speakerOrder).toEqual(['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p1']);
  });

  it('lets only the current speaker end their turn early', () => {
    const h = new Harness();
    h.night({});
    h.advanceTo('DISCUSSION');
    expect(h.tryAct('p2', { type: 'END_TURN' })?.code).toBe('NOT_YOUR_TURN');
    const events = h.act('p1', { type: 'END_TURN' });
    expect(events.find((e) => e.type === 'SPEAKER_CHANGED')?.payload).toMatchObject({
      speakerId: 'p2',
      turn: 2,
    });
  });

  it('moves to the vote right after the last speaker ends their turn', () => {
    const h = new Harness();
    h.night({});
    h.advanceTo('DISCUSSION');
    for (const id of h.state.day.speakerOrder) h.act(id, { type: 'END_TURN' });
    expect(h.phase).toBe('VOTE');
  });

  it('rejects END_TURN outside the discussion', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(h.tryAct('p1', { type: 'END_TURN' })?.code).toBe('NOT_YOUR_TURN');
  });

  it('exposes the order and the speaker in every view, and END_TURN to the speaker', () => {
    const h = new Harness();
    h.night({});
    h.advanceTo('DISCUSSION');
    const speaker = projectFor(h.state, 'p1');
    expect(speaker.speakerId).toBe('p1');
    expect(speaker.me?.pendingAction).toBe('END_TURN');
    const listener = projectFor(h.state, 'p7');
    expect(listener.speakerOrder).toHaveLength(8);
    expect(listener.me?.pendingAction).toBeNull();
    expect(projectFor(h.state, null).speakerId).toBe('p1');
  });
});

describe('channels in the player view', () => {
  it('mirrors voicePermissions so the UI knows when the mic / chat box is open', () => {
    const h = new Harness();
    h.night({});
    h.advanceTo('DISCUSSION');
    expect(projectFor(h.state, 'p1').channels).toEqual({
      main: { publish: true, subscribe: true },
    });
    expect(projectFor(h.state, 'p2').channels).toEqual({
      main: { publish: false, subscribe: true },
    });
  });
});
