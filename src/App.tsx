import { useCallback, useEffect, useRef, useState } from 'react';
import { StudioViewer, preloadLook, type ViewerApi } from './components/StudioViewer';
import { fetchLooks, type Look } from './types';

const number = (value: number) => String(value).padStart(2, '0');
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Icon({ name }: { name: 'left' | 'right' | 'pause' | 'play' | 'reset' | 'plus' | 'minus' | 'close' | 'rotate' | 'expand' }) {
  const paths = {
    left: 'M19 12H5m6-6-6 6 6 6', right: 'M5 12h14m-6-6 6 6-6 6',
    pause: 'M9 5v14M15 5v14', play: 'm8 5 11 7-11 7Z',
    reset: 'M4 10a8 8 0 1 1 1 7M4 4v6h6', plus: 'M5 12h14M12 5v14',
    minus: 'M5 12h14', close: 'm6 6 12 12M6 18 18 6',
    rotate: 'M4 9C4 4 20 4 20 9s-16 5-16 0m0 0 3-3M4 9l3 3M12 11v9m-4-3 4 3 4-3',
    expand: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5',
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function App() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [faded, setFaded] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fatal, setFatal] = useState(false);
  const [retry, setRetry] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [panel, setPanel] = useState<'collection' | 'details' | null>(null);
  const api = useRef<ViewerApi | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const renderSettled = useRef<((succeeded: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const look = looks[index];

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    fetchLooks().then(list => { if (!cancelled) setLooks(list); }).catch((cause: Error) => {
      if (!cancelled) { setError(cause.message); setFatal(true); }
    });
    return () => {
      cancelled = true;
      alive.current = false;
      renderSettled.current?.(false);
      renderSettled.current = null;
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (media.matches) setPlaying(false); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  const loaded = useCallback((hasAnimation: boolean) => {
    if (!alive.current) return;
    api.current?.reset();
    setReady(true); setAnimated(hasAnimation); setError(''); setFatal(false);
    requestAnimationFrame(() => setFaded(false));
    renderSettled.current?.(true);
    renderSettled.current = null;
  }, []);
  const failed = useCallback((message: string) => {
    if (!alive.current) return;
    setError(message); setFatal(true); setReady(false);
    renderSettled.current?.(false);
    renderSettled.current = null;
  }, []);
  useEffect(() => {
    if (ready && looks.length > 1) void preloadLook(looks[(index + 1) % looks.length]).catch(() => {});
  }, [ready, index, looks]);

  const select = useCallback(async (next: number) => {
    if (busy.current || !looks.length || next === index) return;
    busy.current = true; setPending(true); setError('');
    try {
      await preloadLook(looks[next]);
      if (!alive.current) return;
      setFaded(true);
      await delay(reducedMotion() ? 0 : 420);
      if (!alive.current) return;
      const rendered = new Promise<boolean>(resolve => { renderSettled.current = resolve; });
      setReady(false); setFatal(false); setIndex(next); setPanel(null);
      const succeeded = await rendered;
      if (succeeded) await delay(reducedMotion() ? 0 : 450);
    } catch {
      if (alive.current) { setError('선택한 의상을 불러오지 못했습니다. 다시 선택해 주세요.'); setFaded(false); }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }, [looks, index]);
  const move = useCallback((step: number) => {
    if (looks.length) void select((index + step + looks.length) % looks.length);
  }, [looks.length, index, select]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (panel || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.code === 'Space' && ready && animated) { event.preventDefault(); setPlaying(value => !value); }
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, panel, ready, animated]);
  useEffect(() => { if (panel) dialog.current?.showModal(); else dialog.current?.close(); }, [panel]);
  function reload() {
    if (!look) { location.reload(); return; }
    setError(''); setFatal(false); setReady(false); setFaded(true); setRetry(value => value + 1);
  }

  return <main className={`showroom ${focusMode ? 'is-focused' : ''}`}>
    <header className="site-header">
      <a href="./index.html" className="wordmark" aria-label="FORM 스튜디오 홈">FORM<span>®</span></a>
      <span className="header-caption">A STUDY IN DIGITAL COUTURE</span>
      <button className="collection-link" onClick={() => setPanel('collection')}>THE COLLECTION <span>{number(looks.length)}</span><Icon name="expand" /></button>
    </header>
    <section className="showroom-stage" aria-label="인터랙티브 패션 쇼룸">
      <div className="stage-atmosphere" aria-hidden="true" />
      <div className="stage-word" aria-hidden="true">FORM</div>
      <div className="stage-topline"><span><i className="live-dot" />VIRTUAL SHOWROOM</span><span>VOLUME 01 — FORM & MOTION</span></div>
      <div className="editorial-copy">
        <span className="eyebrow">THE DIGITAL ATELIER / 001</span>
        <h1>Beyond<br />the <em>fabric.</em></h1>
        <p>형태와 움직임 사이,<br />디지털로 펼쳐지는 새로운 실루엣.</p>
        <button className="text-link" onClick={() => setPanel('details')}>EXPLORE THE LOOK <Icon name="right" /></button>
      </div>
      <div className={`model-viewport ${faded ? 'is-faded' : ''}`} aria-busy={!ready || pending}>
        {look && <StudioViewer key={retry} look={look} playing={playing} apiRef={api} onReady={loaded} onError={failed} />}
      </div>
      {!ready && !fatal && <div className="loading-state" role="status"><span className="loading-ring" /><span>PREPARING THE ATELIER</span><small>의상을 불러오는 중</small></div>}
      {fatal && <div className="loading-state error-state" role="alert"><span className="eyebrow">THE STUDIO IS TAKING A MOMENT</span><p>{error}</p><button className="outlined-button" onClick={reload}>다시 불러오기 <Icon name="reset" /></button></div>}
      <aside className="look-specification">
        <span className="eyebrow">ON DISPLAY</span>
        <div className="spec-number">{number(index + 1)}<span> / {number(looks.length)}</span></div>
        <div className="spec-rule" />
        <dl><dt>SILHOUETTE</dt><dd>{look?.silhouette ?? '—'}</dd><dt>PALETTE</dt><dd><i className="swatch" style={{ background: look?.color ?? '#b6a28d' }} />{look?.material ?? '—'}</dd><dt>STUDY</dt><dd>{look?.origin ?? 'Digital garment'}</dd></dl>
        <button className="detail-link" onClick={() => setPanel('details')}>작품 정보 <span>↗</span></button>
      </aside>
      <div className="side-label">FASHION, IN ANOTHER DIMENSION.</div>
      <div className="stage-bottom">
        <span className="interaction-hint"><Icon name="rotate" /><span>DRAG TO EXPLORE <b>360°</b><small>드래그하여 회전 · 스크롤 / 핀치로 확대</small></span></span>
        <div className="viewer-controls" aria-label="3D 뷰어 조작">
          <button className="motion-button" disabled={!ready || !animated || pending} onClick={() => setPlaying(value => !value)} aria-label={playing ? '워킹 일시정지' : '워킹 재생'} title={animated ? '워킹 애니메이션 재생 / 정지' : '이 모델에는 애니메이션이 없습니다'}><Icon name={playing && animated ? 'pause' : 'play'} /><span>{!animated && ready ? 'STILL LOOK' : playing ? 'PAUSE' : 'PLAY'}</span></button>
          <span className="tool-divider" />
          <button disabled={!ready} onClick={() => api.current?.zoom(-1)} aria-label="축소"><Icon name="minus" /></button>
          <button disabled={!ready} onClick={() => api.current?.zoom(1)} aria-label="확대"><Icon name="plus" /></button>
          <button disabled={!ready} onClick={() => api.current?.reset()} aria-label="시점 초기화" title="정면으로 돌아가기"><Icon name="reset" /></button>
          <button className="focus-button" onClick={() => setFocusMode(value => !value)} aria-label={focusMode ? '전체 구성 보기' : '의상에 집중하기'} aria-pressed={focusMode} title="의상에 집중하기"><Icon name={focusMode ? 'close' : 'expand'} /></button>
        </div>
      </div>
    </section>
    <footer className="look-footer">
      <div className="current-look" aria-live="polite"><span className="eyebrow">LOOK {number(index + 1)} <span className="label-slash">/</span> {look?.season ?? 'THE COLLECTION'}</span><h2>{look?.name ?? 'Digital atelier'}</h2><span className="look-category">{look?.category} <i /> {look?.demo ? '워킹 테스트 모델' : look?.sourceType === 'archive' ? 'CLO 3D 아카이브 샘플' : '디자이너 작품'}</span></div>
      <div className="collection-progress" aria-label="의상 선택">{looks.map((item, i) => <button key={item.id} className={i === index ? 'active' : ''} aria-label={`${number(i + 1)} ${item.name} 선택`} aria-current={i === index ? 'true' : undefined} onClick={() => void select(i)} disabled={pending}><span>{number(i + 1)}</span><i /></button>)}</div>
      <div className="look-navigation"><button onClick={() => move(-1)} disabled={pending || looks.length < 2} aria-label="이전 의상"><Icon name="left" /></button><button onClick={() => move(1)} disabled={pending || looks.length < 2} aria-label="다음 의상"><Icon name="right" /></button></div>
    </footer>
    <div className="colophon"><span>FORM® — INDEPENDENT FASHION PORTFOLIO</span><button onClick={() => setPanel('details')}>PROTOTYPE / ASSET CREDITS ↗</button><span>DESIGNED TO BE EXPLORED.</span></div>
    {(pending || (error && !fatal)) && <div className="toast" role={error ? 'alert' : 'status'}>{error || '다음 의상을 준비하고 있습니다…'}</div>}
    <dialog ref={dialog} className="information-panel" onCancel={() => setPanel(null)} onClick={event => { if (event.target === dialog.current) setPanel(null); }}>
      <div className="panel-content"><div className="panel-header"><span className="eyebrow">FORM / {panel === 'collection' ? 'THE COLLECTION' : 'THE GARMENT STUDY'}</span><button autoFocus onClick={() => setPanel(null)} aria-label="닫기"><Icon name="close" /></button></div>
        {panel === 'collection' ? <><h2>The collection<span>.</span></h2><p className="panel-intro">실루엣을 선택하고, 모든 각도에서 살펴보세요.</p><div className="look-list">{looks.map((item, i) => <button key={item.id} className={i === index ? 'selected' : ''} disabled={pending} onClick={() => { if (i === index) setPanel(null); else void select(i); }}><span>{number(i + 1)}</span><span><strong>{item.name}</strong><small>{item.category} · {item.demo ? '워킹 데모' : item.sourceType === 'archive' ? 'CLO 샘플' : '디자이너 작품'}</small></span><Icon name="right" /></button>)}</div></> : <><h2>{look?.name}<span>.</span></h2><p className="panel-intro">{look?.description}</p><dl className="detail-data"><div><dt>Collection</dt><dd>{look?.season}</dd></div><div><dt>Silhouette</dt><dd>{look?.silhouette}</dd></div><div><dt>Motion</dt><dd>{animated ? '제자리 워킹 · 반복 재생' : '정적 의상 · 360° 감상'}</dd></div></dl>{(look?.demo || look?.sourceNote) && <p className="sample-note">{look.sourceNote ?? '인터랙션 확인을 위해 직접 생성한 테스트 모델입니다. 실제 CLO 의상 및 원단 시뮬레이션이 아닙니다.'}</p>}{look?.credit && <div className="asset-credit"><span className="eyebrow">MODEL CREDIT</span><a href={look.credit.url} target="_blank" rel="noreferrer">{look.credit.author} ↗</a><a href={look.credit.licenseUrl} target="_blank" rel="noreferrer">{look.credit.license} ↗</a><small>{look.credit.changes}</small></div>}<p className="control-note">드래그: 회전 / 스크롤·핀치: 확대<br />← →: 의상 전환 / Space: 워킹 재생·정지</p></>}
      </div>
    </dialog>
  </main>;
}
