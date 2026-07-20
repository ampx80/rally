// KNOWLEDGE CHECK mode. An adaptive quiz on Ardovo concepts: get one right and
// the next question gets harder; miss one and it eases off. Eight questions,
// weighted by difficulty. Immediate right/wrong feedback with an explanation,
// then a graded results screen. Deterministic engine in src/lib/arena.js.
// ASCII only.
import React, { useState } from 'react';
import { Card, Button, Badge, SectionHeader, ProgressBar } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  newQuizSession, nextQuizQuestion, answerQuizQuestion, gradeKnowledge,
  recordResult, QUIZ_LENGTH,
} from '../../lib/arena.js';
import ResultsScreen from './ResultsScreen.jsx';

const DIFF_TONE = { easy: 'ok', med: 'warn', hard: 'risk' };
const DIFF_LABEL = { easy: 'Easy', med: 'Medium', hard: 'Hard' };

export default function KnowledgeCheck({ roleId, onExit }) {
  const [session, setSession] = useState(() => newQuizSession());
  const [question, setQuestion] = useState(() => nextQuizQuestion(newQuizSession()));
  const [picked, setPicked] = useState(null);   // index chosen, before advancing
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState(null);
  const [awarded, setAwarded] = useState([]);

  function choose(idx) {
    if (picked != null) return;
    setPicked(idx);
    const correct = idx === question.answer;
    setStreak((s) => (correct ? s + 1 : 0));
  }

  function advance() {
    const next = answerQuizQuestion(session, question, picked);
    setSession(next);
    setPicked(null);
    if (next.done) {
      const graded = gradeKnowledge(next);
      const rec = recordResult('knowledge', roleId, graded);
      setAwarded(rec.awarded);
      setResult(graded);
    } else {
      setQuestion(nextQuizQuestion(next));
    }
  }

  function restart() {
    const s = newQuizSession();
    setSession(s);
    setQuestion(nextQuizQuestion(s));
    setPicked(null);
    setStreak(0);
    setResult(null);
    setAwarded([]);
  }

  if (result) {
    return (
      <ResultsScreen
        result={result}
        awarded={awarded}
        certifiedNow={false}
        retryLabel="New quiz"
        onRetry={restart}
        onExit={onExit}
      />
    );
  }

  if (!question) {
    return (
      <Card pad>
        <SectionHeader title="No questions available" />
        <Button variant="primary" onClick={onExit} style={{ marginTop: '1rem' }}>Back to Arena</Button>
      </Card>
    );
  }

  const answered = session.served.length;
  const progressPct = Math.round((answered / QUIZ_LENGTH) * 100);
  const isCorrect = picked != null && picked === question.answer;

  return (
    <div className="col gap-2" style={{ maxWidth: 680, margin: '0 auto' }}>
      <Card pad>
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div className="col gap-1" style={{ flex: 1, minWidth: 180 }}>
            <div className="row between t-sm">
              <span className="fw-6">Question {answered + 1} of {QUIZ_LENGTH}</span>
              {streak >= 2 && <span className="fw-7" style={{ color: 'var(--warn)' }}><span className="ar-flame">{'\u25B2'}</span> {streak} streak</span>}
            </div>
            <ProgressBar value={progressPct} />
          </div>
          <Button variant="ghost" size="sm" onClick={onExit}><Icon name="arrowLeft" size={15} /> Back</Button>
        </div>
      </Card>

      <Card pad className="ar-rise" key={question.id}>
        <div className="row gap-2" style={{ marginBottom: '.85rem' }}>
          <Badge tone={DIFF_TONE[question.difficulty]}>{DIFF_LABEL[question.difficulty]}</Badge>
          <Badge tone="default">{question.topic}</Badge>
        </div>
        <div className="fw-7" style={{ fontSize: '1.15rem', lineHeight: 1.45, marginBottom: '1rem' }}>{question.q}</div>
        <div className="col gap-2">
          {question.choices.map((c, i) => {
            let cls = 'btn btn-ghost ar-choice';
            if (picked != null) {
              if (i === question.answer) cls += ' ar-choice-correct';
              else if (i === picked) cls += ' ar-choice-wrong';
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={picked != null}
                onClick={() => choose(i)}
                style={{ padding: '.8rem 1rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', justifyContent: 'flex-start' }}
              >
                <span className="row gap-2" style={{ alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--n-600)', width: 18 }}>{String.fromCharCode(65 + i)}</span>
                  <span>{c}</span>
                </span>
              </button>
            );
          })}
        </div>

        {picked != null && (
          <div className="col gap-2 ar-rise" style={{ marginTop: '1rem', padding: '.9rem 1rem', borderRadius: 'var(--r-sm)', background: isCorrect ? 'color-mix(in srgb, var(--ok) 10%, transparent)' : 'color-mix(in srgb, var(--risk) 8%, transparent)' }}>
            <div className="fw-7 row gap-2" style={{ alignItems: 'center', color: isCorrect ? 'var(--ok)' : 'var(--risk)' }}>
              <Icon name={isCorrect ? 'check' : 'x'} size={18} />
              {isCorrect ? 'Correct' : 'Not quite'}
            </div>
            <div className="t-sm" style={{ lineHeight: 1.55 }}>{question.explain}</div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={advance}>
                {answered + 1 >= QUIZ_LENGTH ? 'See my score' : 'Next question'} <Icon name="chevronRight" size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
