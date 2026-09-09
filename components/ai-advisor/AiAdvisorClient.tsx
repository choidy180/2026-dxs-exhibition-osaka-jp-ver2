'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Bot, CalendarDays, ChevronRight, CircleAlert, Database, MessageSquare, Plus, Search, Send, Sparkles, X } from 'lucide-react';
import { useAiAdvisor } from '@/hooks/use-ai-advisor';
import { ADVISOR_EXAMPLES, ADVISOR_FOLLOWUP } from '@/constants/ai-advisor';
import { motionDuration } from '@/styles/design-tokens';
import { ADVISOR_QUERY_MAX_LENGTH } from '@/utils/ai-advisor-contract';
import AdvisorResultTable from './AdvisorResultTable';
import AdvisorWaitingCard from './AdvisorWaitingCard';
import * as S from './styles';

export default function AiAdvisorClient({ launcherPlacement = 'rail' }: { launcherPlacement?: 'rail' | 'corner' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chat = useAiAdvisor(isOpen);
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputLength = Array.from(input).length;
  const canSend = input.trim().length > 0 && inputLength <= ADVISOR_QUERY_MAX_LENGTH && !chat.isLoading;

  const close = useCallback(() => setIsOpen(false), []);
  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'nearest' });
  }, [reduceMotion]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, [tabindex="0"]') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && isAtBottom) scrollToBottom();
  }, [chat.messages, chat.isLoading, chat.error, isOpen, isAtBottom, scrollToBottom]);

  const send = async (query: string) => {
    if (await chat.send(query)) {
      setInput('');
      setIsAtBottom(true);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    chat.reset();
    setInput('');
    setIsAtBottom(true);
    inputRef.current?.focus();
  };

  const queries = chat.messages.filter(message => message.role === 'user');
  const hasAnswer = chat.messages.some(message => message.role === 'assistant' && message.status === 'success');

  return (
    <>
      <S.Launcher $corner={launcherPlacement === 'corner'} type="button" aria-label="AI Advisor 열기" aria-haspopup="dialog" aria-expanded={isOpen} whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { y: 0 }} transition={{ duration: motionDuration.fast }} onClick={() => setIsOpen(true)}>
        <S.LauncherMark aria-hidden="true"><Sparkles size={22} strokeWidth={1.7} /></S.LauncherMark>
        <S.LauncherCopy $corner={launcherPlacement === 'corner'}>
          <S.LauncherTitle $corner={launcherPlacement === 'corner'}>AI Advisor</S.LauncherTitle>
          {launcherPlacement === 'corner' && <S.LauncherHint>데이터에 질문하기</S.LauncherHint>}
        </S.LauncherCopy>
        {launcherPlacement === 'corner' && <S.LauncherArrow aria-hidden="true"><ArrowUpRight size={16} /></S.LauncherArrow>}
      </S.Launcher>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <S.Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : motionDuration.fast }} onClick={close}>
              <S.Panel ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ai-advisor-title" initial={{ x: reduceMotion ? 0 : 24 }} animate={{ x: 0 }} exit={{ x: reduceMotion ? 0 : 24 }} transition={{ duration: reduceMotion ? 0 : motionDuration.enter }} onClick={event => event.stopPropagation()}>
                <S.Header>
                  <S.HeaderTitle>
                    <S.Avatar><Bot size={24} /></S.Avatar>
                    <div><h2 id="ai-advisor-title">AI Advisor</h2><p>자재 소요량 · 계획 데이터 조회</p></div>
                  </S.HeaderTitle>
                  <S.Actions>
                    <S.Button type="button" onClick={reset}><Plus size={16} />새 대화</S.Button>
                    <S.IconButton type="button" aria-label="AI Advisor 닫기" onClick={close}><X size={18} /></S.IconButton>
                  </S.Actions>
                </S.Header>
                <S.Workspace>
                  <S.Sidebar>
                    <section>
                      <h3><Search size={17} />바로 조회하기</h3>
                      <S.ExampleList>{ADVISOR_EXAMPLES.map(example => <S.Button type="button" key={example.label} disabled={chat.isLoading} onClick={() => void send(example.query)}><ChevronRight size={14} />{example.label}</S.Button>)}</S.ExampleList>
                    </section>
                    <section>
                      <h3><MessageSquare size={17} />이번 대화 · {queries.length.toLocaleString('ko-KR')}건</h3>
                      {queries.length ? queries.map(query => <S.HistoryButton key={query.id} type="button" title={query.text} onClick={() => document.getElementById(`advisor-${query.id}`)?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' })}><span>{query.text}</span></S.HistoryButton>) : <p>질문을 보내면 이곳에서 다시 찾아볼 수 있습니다.</p>}
                    </section>
                    <section>
                      <h3><CalendarDays size={17} />질문 안내</h3>
                      <p>날짜와 자재 조건을 함께 적어주세요. 기준일 이후의 질문에는 ‘계획 소요량’을 명시하면 더 정확하게 조회할 수 있습니다.</p>
                    </section>
                    <section><h3><Database size={17} />대화 보관</h3><p>이 화면을 사용하는 동안 대화가 유지됩니다. 새 대화를 시작하거나 페이지를 새로고침하면 초기화됩니다.</p></section>
                  </S.Sidebar>
                  <S.Chat>
                    <S.DataStatus $error={!!chat.metadataError} role="status">
                      <Database size={14} />
                      {chat.metadataLoading ? '데이터 기준일 확인 중...' : chat.metadataError ? <><span>{chat.metadataError}</span><S.Button type="button" onClick={chat.retryMetadata}>기준일 재시도</S.Button></> : <><span>데이터 기준일 {chat.metadata?.as_of_date ?? '-'}</span><span>계획 조회 종료일 {chat.metadata?.forecast_end_date ?? '-'}</span>{!chat.metadata?.as_of_date && <S.Button type="button" onClick={chat.retryMetadata}>기준일 새로고침</S.Button>}</>}
                    </S.DataStatus>
                    <S.MessageList ref={listRef} role="log" aria-label="AI Advisor 대화" aria-live="polite" aria-relevant="additions" onScroll={() => { const el = listRef.current; if (el) setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100); }}>
                      {chat.messages.length === 0 && <S.Welcome><Bot size={28} /><h3>어떤 자재가 얼마나 필요한가요?</h3><p>날짜별 계획 소요량을 질문해 보세요.<br />조회 결과는 답변과 표로 확인할 수 있습니다.</p><S.ExampleList>{ADVISOR_EXAMPLES.map(example => <S.Button type="button" key={example.label} disabled={chat.isLoading} onClick={() => void send(example.query)}>{example.label}<ChevronRight size={14} /></S.Button>)}</S.ExampleList></S.Welcome>}
                      {chat.messages.map(message => <S.Message id={`advisor-${message.id}`} key={message.id} $user={message.role === 'user'} aria-label={message.role === 'user' ? '내 질문' : 'Advisor 답변'}><strong>{message.role === 'user' ? '나' : 'AI Advisor'}</strong><p>{message.text}</p>{message.status === 'empty' && <S.DataStatus><Search size={14} />조회 조건에 맞는 데이터가 없습니다. 날짜나 자재 조건을 바꿔보세요.</S.DataStatus>}{message.table && <AdvisorResultTable table={message.table} />}</S.Message>)}
                      {chat.isLoading && chat.requestStartedAt !== null && <AdvisorWaitingCard key={chat.requestStartedAt} startedAt={chat.requestStartedAt} durationSamplesMs={chat.responseDurationSamplesMs} onCancel={chat.cancel} />}
                      {chat.error && <S.StateCard $error role="alert"><CircleAlert size={20} /><div><p>{chat.error}</p><S.Button type="button" onClick={chat.retry} disabled={chat.isLoading}>다시 시도</S.Button></div></S.StateCard>}
                      <div ref={endRef} />
                    </S.MessageList>
                    <S.BottomBar>
                      {hasAnswer && <S.Button type="button" disabled={chat.isLoading} onClick={() => void send(ADVISOR_FOLLOWUP)}>같은 날짜의 계획 소요량 1위</S.Button>}
                      {!isAtBottom && <S.Button type="button" onClick={scrollToBottom}><ArrowDown size={14} />최신 답변</S.Button>}
                    </S.BottomBar>
                    <S.Composer onSubmit={event => { event.preventDefault(); if (canSend) void send(input); }}>
                      <S.Input ref={inputRef} aria-label="AI Advisor 질문" placeholder="날짜와 자재 소요량을 질문해 주세요" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); if (canSend) void send(input); } }} />
                      <S.SendButton type="submit" disabled={!canSend} aria-label="질문 보내기"><Send size={17} />전송</S.SendButton>
                    </S.Composer>
                    <S.Footnote><span>{inputLength > ADVISOR_QUERY_MAX_LENGTH ? `질문은 ${ADVISOR_QUERY_MAX_LENGTH.toLocaleString('ko-KR')}자 이내로 입력해 주세요.` : 'Enter 전송 · Shift+Enter 줄바꿈'}</span><span>{inputLength.toLocaleString('ko-KR')} / {ADVISOR_QUERY_MAX_LENGTH.toLocaleString('ko-KR')}</span></S.Footnote>
                  </S.Chat>
                </S.Workspace>
              </S.Panel>
            </S.Overlay>
          )}
        </AnimatePresence>, document.body)}
    </>
  );
}
