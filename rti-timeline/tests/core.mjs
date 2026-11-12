// The date arithmetic of rti-timeline, checked against dates worked outside it.
//
//   node rti-timeline/tests/core.mjs
//
// Every expected date below was computed in Python with datetime.date and
// timedelta, from the periods the Act states, and typed in here. Nothing in
// this file calls the page's own arithmetic to produce an expectation.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script id="core"> in rti-timeline/index.html'); process.exit(1); }
const mod = { exports: {} };
new Function('module', m[1])(mod);
const X = mod.exports;

let checks = 0; const errors = [];
const ok = (name, cond, detail = '') => { checks++; if (!cond) errors.push(`${name}${detail ? ': ' + detail : ''}`); };
const d = s => X.parse(s);
const is = (name, got, want) => ok(name, got != null && X.iso(got) === want, `got ${got == null ? got : X.iso(got)}, want ${want}`);
const step = (t, key) => t.steps.find(s => s.key === key);

// ---- dates
ok('parse rejects 30 February', d('2026-02-30') === null);
ok('parse rejects a thirteenth month', d('2026-13-01') === null);
ok('parse rejects text', d('1 March 2026') === null && d('') === null && d(null) === null);
ok('parse round trip', X.iso(d('2024-02-29')) === '2024-02-29');
ok('31 March 2026 is a Tuesday', X.weekday(d('2026-03-31')) === 2);
ok('5 April 2026 is a Sunday and closed', X.closed(d('2026-04-05')) && X.weekday(d('2026-04-05')) === 0);
ok('30 May 2026 is a Saturday and closed', X.closed(d('2026-05-30')));
ok('a Monday and a Friday are open', !X.closed(d('2026-03-30')) && !X.closed(d('2026-04-03')));

// ---- the reply
const R = '2026-03-01';
is('ordinary reply, thirty days', X.reply({ received: d(R) }).due, '2026-03-31');
is('through an assistant officer, thirty-five', X.reply({ received: d(R), assistant: true }).due, '2026-04-05');
is('third party, forty', X.reply({ received: d(R), thirdParty: true }).due, '2026-04-10');
is('third party through an assistant officer is still forty', X.reply({ received: d(R), thirdParty: true, assistant: true }).due, '2026-04-10');
is('life or liberty, two days', X.reply({ received: d(R), life: true }).due, '2026-03-03');
is('life or liberty through an assistant officer', X.reply({ received: d(R), life: true, assistant: true }).due, '2026-03-08');
is('life or liberty wins over the third-party period', X.reply({ received: d(R), life: true, thirdParty: true }).due, '2026-03-03');
is('across a leap day', X.reply({ received: d('2024-02-01') }).due, '2024-03-02');
is('across a year end', X.reply({ received: d('2025-12-15') }).due, '2026-01-14');
ok('no date, an error', !!X.reply({}).error);

// ---- further fees: 10 March to 24 March is fourteen days left out
const fee = X.reply({ received: d(R), feeSent: d('2026-03-10'), feePaid: d('2026-03-24') });
ok('fee: fourteen days excluded', fee.excluded === 14, `got ${fee.excluded}`);
is('fee: reply due moves by fourteen days', fee.due, '2026-04-14');
const paused = X.reply({ received: d(R), feeSent: d('2026-03-10') });
ok('fee unpaid: the count is stopped', paused.paused === true && paused.due === null);
ok('fee unpaid: twenty-one days remain', paused.left === 21, `got ${paused.left}`);
ok('fee paid before it was asked for, an error', !!X.reply({ received: d(R), feeSent: d('2026-03-10'), feePaid: d('2026-03-09') }).error);
ok('fee asked before the request, an error', !!X.reply({ received: d(R), feeSent: d('2026-02-20'), feePaid: d('2026-03-09') }).error);
const lateFee = X.reply({ received: d(R), feeSent: d('2026-04-02'), feePaid: d('2026-04-09') });
ok('fee asked after the thirty days: nothing excluded, and said so', !!lateFee.error && lateFee.excluded === 0);
is('fee asked after the thirty days: date unchanged', lateFee.due, '2026-03-31');
const lifeFee = X.reply({ received: d(R), life: true, feeSent: d('2026-03-02'), feePaid: d('2026-03-12') });
ok('fee dates are not used on the forty-eight hours', lifeFee.feeIgnored === true && lifeFee.excluded === 0);
is('fee dates do not move the forty-eight hours', lifeFee.due, '2026-03-03');
const tpFee = X.reply({ received: d(R), thirdParty: true, feeSent: d('2026-03-02'), feePaid: d('2026-03-12') });
is('fee dates do not move the forty days', tpFee.due, '2026-04-10');

// ---- transfer
ok('transfer by the fifth day', X.iso(X.transferBy(d(R))) === '2026-03-06');
const tr = X.reply({ received: d(R), transferred: true });
is('transfer, second receipt unknown: five plus thirty', tr.due, '2026-04-05');
ok('transfer, second receipt unknown: flagged', tr.outerOnly === true);
const tr2 = X.reply({ received: d(R), transferred: true, secondReceived: d('2026-03-09') });
is('transfer, counted from the second receipt', tr2.due, '2026-04-08');
is('transfer, the other date is kept beside it', tr2.outer, '2026-04-05');
ok('transfer, second receipt known: not flagged', tr2.outerOnly === false);
ok('second receipt before the first, an error', !!X.reply({ received: d(R), transferred: true, secondReceived: d('2026-02-27') }).error);
const tr3 = X.reply({ received: d(R), transferred: true, secondReceived: d('2026-03-09'), feeSent: d('2026-03-12'), feePaid: d('2026-03-15') });
is('transfer and a fee: both dates move by the three days', tr3.due, '2026-04-11');
is('transfer and a fee: the other date too', tr3.outer, '2026-04-08');

// ---- third party
const tp = X.thirdParty(d(R), d('2026-03-05'));
is('third party: notice by the fifth day', tp.noticeBy, '2026-03-06');
is('third party: ten days from receipt of the notice', tp.representBy, '2026-03-15');
is('third party: decision by the fortieth day', tp.decideBy, '2026-04-10');
ok('third party: no objection date without the notice date', X.thirdParty(d(R), null).representBy === null);
is('third party appeal, thirty days from the order', X.thirdPartyAppealBy(d('2026-03-20')), '2026-04-19');

// ---- appeals
is('first appeal from the expiry of the period', X.firstAppealBy(d('2026-03-31'), null), '2026-04-30');
is('first appeal from the receipt of a decision', X.firstAppealBy(d('2026-03-31'), d('2026-03-18')), '2026-04-17');
is('first appeal from a decision that came late', X.firstAppealBy(d('2026-03-31'), d('2026-04-06')), '2026-05-06');
const dp = X.dispose(d('2026-04-20'));
is('first appeal decided in thirty days', dp.by, '2026-05-20');
is('or forty-five from filing', dp.outer, '2026-06-04');
const sa = X.secondAppealBy(d('2026-04-20'), null);
is('second appeal, no order: ninety days from the thirtieth day', sa.by, '2026-08-18');
is('second appeal, no order: the later reading', sa.later, '2026-09-02');
ok('second appeal, no order: basis', sa.basis === 'due');
const sb = X.secondAppealBy(d('2026-04-20'), d('2026-05-12'));
is('second appeal, ninety days from the order', sb.by, '2026-08-10');
ok('second appeal from an order has one date', sb.later === undefined && sb.basis === 'received');

// ---- the whole timeline
const t1 = X.timeline({ received: d(R) });
ok('plain timeline: three steps in order', t1.steps.map(s => s.key).join() === 'transfer,reply,firstAppeal', t1.steps.map(s => s.key).join());
is('plain timeline: reply', step(t1, 'reply').date, '2026-03-31');
ok('plain timeline: reply under 7(1)', step(t1, 'reply').section === '7(1)');
is('plain timeline: first appeal', step(t1, 'firstAppeal').date, '2026-04-30');
ok('plain timeline: first appeal counted from the expiry', step(t1, 'firstAppeal').basis === 'expiry');
const t2 = X.timeline({ received: d(R), assistant: true, feeSent: d('2026-03-10'), feePaid: d('2026-03-24'), decisionReceived: d('2026-04-15'), appealFiled: d('2026-04-20'), orderReceived: d('2026-05-12') });
is('full timeline: reply, thirty-five plus fourteen', step(t2, 'reply').date, '2026-04-19');
ok('full timeline: the reply date is a Sunday and marked', step(t2, 'reply').weekend === true);
is('full timeline: first appeal from the decision', step(t2, 'firstAppeal').date, '2026-05-15');
ok('full timeline: first appeal basis', step(t2, 'firstAppeal').basis === 'received');
is('full timeline: disposal', step(t2, 'dispose').date, '2026-05-20');
ok('full timeline: appeal in time is not marked late', step(t2, 'dispose').late === false);
is('full timeline: second appeal', step(t2, 'secondAppeal').date, '2026-08-10');
const t3 = X.timeline({ received: d(R), thirdParty: true, noticeReceived: d('2026-03-05'), thirdOrder: d('2026-03-20') });
ok('third-party timeline: steps', t3.steps.map(s => s.key).join() === 'transfer,notice,represent,reply,thirdAppeal,firstAppeal', t3.steps.map(s => s.key).join());
ok('third-party timeline: the decision is under 11(3)', step(t3, 'reply').section === '11(3)');
is('third-party timeline: third party appeal', step(t3, 'thirdAppeal').date, '2026-04-19');
is('third-party timeline: applicant appeal from the fortieth day', step(t3, 'firstAppeal').date, '2026-05-10');
const t4 = X.timeline({ received: d(R), feeSent: d('2026-03-10') });
ok('unpaid fee: the timeline stops at the reply', t4.steps.map(s => s.key).join() === 'transfer,reply' && step(t4, 'reply').paused === true && step(t4, 'reply').date === null);
const t5 = X.timeline({ received: d(R), appealFiled: d('2026-05-04') });
ok('an appeal after the last day is marked late', step(t5, 'dispose').late === true);
ok('an appeal on the last day is in time', step(X.timeline({ received: d(R), appealFiled: d('2026-04-30') }), 'dispose').late === false);
ok('no date, the timeline says so', !!X.timeline({}).error);

if (errors.length) { console.error(`FAIL: ${errors.length} of ${checks} checks\n  ` + errors.join('\n  ')); process.exit(1); }
console.log(`OK: rti-timeline core, ${checks} checks.`);
