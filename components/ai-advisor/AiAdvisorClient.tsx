'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Bot, BookOpen, ChevronDown, ChevronRight, CircleAlert, Database, LoaderCircle, MessageSquare, Plus, Search, Send, Sparkles, X } from 'lucide-react';
import { useAiAdvisor } from '@/hooks/use-ai-advisor';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { ADVISOR_COPY } from '@/constants/ai-advisor';
import { ADVISOR_QUESTION_CATALOG, ADVISOR_TOPIC_LABELS, getAdvisorTopicStarters } from '@/data/advisor-conversation-catalog';
import type { AdvisorConversationContext, AdvisorTopic } from '@/types/ai-advisor';
import { motionDuration } from '@/styles/design-tokens';
import { ADVISOR_QUERY_MAX_LENGTH } from '@/utils/ai-advisor-contract';
import AdvisorResultTable from './AdvisorResultTable';
import { useExhibitionDemo } from '@/components/exhibition-demo/ExhibitionDemoProvider';
import { ADVISOR_DEMO_PAGE_INDEX } from '@/constants/exhibition-demo';
import * as S from './styles';

export default function AiAdvisorClient({ launcherPlacement = 'rail' }: { launcherPlacement?: 'rail' | 'corner' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const { locale } = useLocale();
  const copy = ADVISOR_COPY[locale];
  const examples = getAdvisorTopicStarters(locale);
  const chat = useAiAdvisor(isOpen);
  const demo = useExhibitionDemo();
  const demoPresentation = !!demo?.enabled && demo.pageIndex === ADVISOR_DEMO_PAGE_INDEX;
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLButtonElement>(null);
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
      // 시연 설정이 위에 열려 있으면 OFF와 Esc를 해당 설정에서 조작할 수 있게 한다.
      if (document.querySelector('[data-demo-controls] button[aria-expanded="true"]')) return;
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

  const send = async (query: string, fromContext?: AdvisorConversationContext) => {
    if (await chat.send(query, fromContext)) {
      setInput('');
      setGuideOpen(false);
      setIsAtBottom(true);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    chat.reset();
    setInput('');
    setGuideOpen(false);
    setIsAtBottom(true);
    inputRef.current?.focus();
  };

  const showGuide = () => {
    setGuideOpen(true);
    setIsAtBottom(false);
    guideRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' });
    guideRef.current?.focus();
  };
  const queries = chat.messages.filter(message => message.role === 'user');
  const latestReply = chat.messages.at(-1)?.role === 'assistant' ? chat.messages.at(-1)?.id : undefined;
  const placeholder = chat.context.pending === 'productCode' ? copy.productHint : chat.context.pending === 'materialCode' ? copy.materialHint : chat.context.pending === 'quantity' ? copy.quantityHint : chat.context.pending === 'workers' ? copy.workersHint : chat.context.pending === 'date' ? copy.dateHint : copy.placeholder;

  return (
    <>
      <S.Launcher data-demo="advisor-open" $corner={launcherPlacement === 'corner'} type="button" aria-label={copy.open} aria-haspopup="dialog" aria-expanded={isOpen} whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { y: 0 }} transition={{ duration: motionDuration.fast }} onClick={() => setIsOpen(true)}>
        <S.LauncherMark aria-hidden="true"><Sparkles size={22} strokeWidth={1.7} /></S.LauncherMark>
        <S.LauncherCopy $corner={launcherPlacement === 'corner'}>
          <S.LauncherTitle $corner={launcherPlacement === 'corner'}>AI Advisor</S.LauncherTitle>
          {launcherPlacement === 'corner' && <S.LauncherHint>{copy.launcher}</S.LauncherHint>}
        </S.LauncherCopy>
        {launcherPlacement === 'corner' && <S.LauncherArrow aria-hidden="true"><ArrowUpRight size={16} /></S.LauncherArrow>}
      </S.Launcher>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <S.Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : motionDuration.fast }} onClick={close}>
              <S.Panel ref={panelRef} $demo={demoPresentation} data-demo="advisor-panel" data-ai-advisor-panel role="dialog" aria-modal="true" aria-labelledby="ai-advisor-title" initial={{ x: reduceMotion ? 0 : 24 }} animate={{ x: 0 }} exit={{ x: reduceMotion ? 0 : 24 }} transition={{ duration: reduceMotion ? 0 : motionDuration.enter }} onClick={event => event.stopPropagation()}>
                <S.Header>
                  <S.HeaderTitle>
                    <S.Avatar><Bot size={24} /></S.Avatar>
                    <div><h2 id="ai-advisor-title">AI Advisor</h2><p>{copy.subtitle}</p></div>
                  </S.HeaderTitle>
                  <S.Actions>
                    <S.Button data-demo="advisor-reset" type="button" onClick={reset}><Plus size={16} />{copy.newChat}</S.Button>
                    <S.IconButton data-demo="advisor-close" type="button" aria-label={copy.close} onClick={() => { setInput(''); close(); }}><X size={18} /></S.IconButton>
                  </S.Actions>
                </S.Header>
                <S.Workspace>
                  <S.Sidebar>
                    <section>
                      <h3><BookOpen size={17} />{copy.scopeTitle}</h3>
                      <p>{copy.scope}</p>
                      <S.ExampleList>{examples.map(example => <S.Button type="button" key={example.id} disabled={chat.isLoading} title={example.query} onClick={() => void send(example.query)}><ChevronRight size={14} />{example.label}</S.Button>)}</S.ExampleList>
                      <S.Button type="button" onClick={showGuide}><Search size={14} />{copy.catalog}</S.Button>
                    </section>
                    <section>
                      <h3><MessageSquare size={17} />{copy.history} · {queries.length.toLocaleString('ko-KR')}</h3>
                      {queries.length ? queries.map(query => <S.HistoryButton key={query.id} type="button" title={query.text} onClick={() => document.getElementById(`advisor-${query.id}`)?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' })}><span>{query.text}</span></S.HistoryButton>) : <p>{copy.noHistory}</p>}
                    </section>
                    <section><h3><Database size={17} />{copy.storageTitle}</h3><p>{copy.storage}</p></section>
                  </S.Sidebar>
                  <S.Chat>
                    <S.DataStatus $error={!!chat.metadataError} role="status">
                      <Database size={14} />
                      {chat.metadataLoading ? copy.checking : chat.metadataError ? <><span>{copy.failure}</span><S.Button type="button" onClick={chat.retryMetadata}>{copy.retryDate}</S.Button></> : <><span>{copy.sourceDate} {chat.metadata?.snapshot_date ?? chat.metadata?.as_of_date ?? '-'}</span><span>{copy.sourceNote}</span>{!chat.metadata?.as_of_date && <S.Button type="button" onClick={chat.retryMetadata}>{copy.retryDate}</S.Button>}</>}
                    </S.DataStatus>
                    <S.MessageList ref={listRef} role="log" aria-label="AI Advisor" aria-live="polite" aria-relevant="additions" onScroll={() => { const el = listRef.current; if (el) setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100); }}>
                      {chat.messages.length === 0 && <S.Welcome data-demo="advisor-welcome"><Bot size={28} /><h3>{copy.welcome}</h3><p>{copy.welcomeText}</p><S.ExampleList>{examples.map(example => <S.Button type="button" key={example.id} disabled={chat.isLoading} title={example.query} onClick={() => void send(example.query)}>{example.label}<ChevronRight size={14} /></S.Button>)}</S.ExampleList></S.Welcome>}
                      <S.GuideToggle ref={guideRef} data-demo="advisor-guide" type="button" aria-expanded={guideOpen} aria-controls="advisor-question-guide" onClick={() => setGuideOpen(previous => !previous)}><BookOpen size={16} />{copy.guide}<ChevronDown size={16} /></S.GuideToggle>
                      {guideOpen && <S.QuestionGuide data-demo="advisor-catalog" id="advisor-question-guide">
                        <p>{copy.guideHint}</p>
                        {(Object.keys(ADVISOR_TOPIC_LABELS) as AdvisorTopic[]).map(topic => <section key={topic}><h3>{ADVISOR_TOPIC_LABELS[topic][locale]}</h3><S.ExampleList>{ADVISOR_QUESTION_CATALOG.filter(question => question.topic === topic).map(question => <S.QuestionButton key={question.id} type="button" disabled={chat.isLoading} onClick={() => void send(question.question[locale])}><span>{question.label[locale]}</span><small>{question.question[locale]}</small></S.QuestionButton>)}</S.ExampleList></section>)}
                      </S.QuestionGuide>}
                      {chat.messages.map(message => <S.Message id={`advisor-${message.id}`} key={message.id} data-demo={message.id === latestReply ? 'advisor-reply' : undefined} $user={message.role === 'user'} aria-label={message.role === 'user' ? copy.you : 'AI Advisor'}>
                        <strong>{message.role === 'user' ? copy.you : 'AI Advisor'}</strong>
                        {message.status === 'partial' && <S.ReplyBadge>{copy.partial}</S.ReplyBadge>}
                        {(message.dataKind === 'demo' || message.dataKind === 'calculated') && <S.DemoBadge>{message.dataKind === 'calculated' ? copy.calculated : copy.demoResult}</S.DemoBadge>}
                        <p>{message.text}</p>
                        {message.status === 'empty' && <S.DataStatus><Search size={14} />{copy.empty}</S.DataStatus>}
                        {message.table && <AdvisorResultTable table={message.table} />}
                        {!!message.suggestions?.length && <S.Suggestions aria-label={message.suggestionsTitle ?? copy.suggested}><span>{message.suggestionsTitle ?? copy.suggested}</span><S.ExampleList>{message.suggestions.map((suggestion, index) => <S.SuggestionButton key={suggestion.id} data-demo={message.id === latestReply ? `advisor-choice-${suggestion.id}` : undefined} type="button" disabled={chat.isLoading} title={suggestion.query} onClick={() => void send(suggestion.query, message.context)}><S.OptionNumber aria-hidden="true">{(index + 1).toLocaleString('ko-KR')}</S.OptionNumber><span>{suggestion.label}</span><ChevronRight size={14} /></S.SuggestionButton>)}</S.ExampleList><small>{copy.selectionHint}</small></S.Suggestions>}
                      </S.Message>)}
                      {chat.isLoading && <S.StateCard role="status"><LoaderCircle size={20} /><div><p>{copy.waiting}</p><S.Button data-demo="advisor-cancel" type="button" onClick={chat.cancel}>{copy.cancel}</S.Button></div></S.StateCard>}
                      {chat.error && <S.StateCard $error role="alert"><CircleAlert size={20} /><div><p>{chat.error}</p><S.Button type="button" onClick={chat.retry} disabled={chat.isLoading}>{copy.retry}</S.Button></div></S.StateCard>}
                      <div ref={endRef} />
                    </S.MessageList>
                    <S.BottomBar>
                      <S.Button type="button" onClick={showGuide}><BookOpen size={14} />{copy.catalog}</S.Button>
                      {!isAtBottom && <S.Button type="button" onClick={scrollToBottom}><ArrowDown size={14} />{copy.latest}</S.Button>}
                    </S.BottomBar>
                    {chat.context.topic && <S.ContextBar aria-label={copy.context}><span>{ADVISOR_TOPIC_LABELS[chat.context.topic][locale]}</span>{chat.context.productCode && <span>{chat.context.productCode}</span>}{chat.context.materialCode && <span>{chat.context.materialCode}</span>}{chat.context.quantity && <span>{copy.quantityLabel} {chat.context.quantity.toLocaleString('ko-KR')}</span>}{chat.context.workers && <span>{copy.workersLabel} {chat.context.workers.toLocaleString('ko-KR')}</span>}{chat.context.date && <span>{chat.context.date}</span>}<S.Button type="button" disabled={chat.isLoading} onClick={() => void send(copy.menuQuery)}>{copy.changeTopic}</S.Button></S.ContextBar>}
                    <S.Composer onSubmit={event => { event.preventDefault(); if (canSend) void send(input); }}>
                      <S.Input ref={inputRef} data-demo="advisor-input" aria-label={copy.question} placeholder={placeholder} value={input} onInput={event => setInput(event.currentTarget.value)} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); if (canSend) void send(input); } }} />
                      <S.SendButton data-demo="advisor-submit" type="submit" disabled={!canSend} aria-label={copy.send}><Send size={17} />{copy.send}</S.SendButton>
                    </S.Composer>
                    <S.Footnote><span>{inputLength > ADVISOR_QUERY_MAX_LENGTH ? copy.tooLong : copy.keyboard}</span><span>{inputLength.toLocaleString('ko-KR')} / {ADVISOR_QUERY_MAX_LENGTH.toLocaleString('ko-KR')}</span></S.Footnote>
                  </S.Chat>
                </S.Workspace>
              </S.Panel>
            </S.Overlay>
          )}
        </AnimatePresence>, document.body)}
    </>
  );
}
