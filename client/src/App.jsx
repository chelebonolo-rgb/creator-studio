import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Copy,
  Bell,
  Eye,
  Film,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Mic2,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const CREATOR_NAME = import.meta.env.VITE_CREATOR_NAME || 'Alex Morgan';
const CREATOR_INTRO =
  import.meta.env.VITE_CREATOR_INTRO ||
  'Thoughtful stories, useful ideas, and creative work for a more curious life.';
const CATEGORIES = ['All', 'Education', 'Technology', 'Entertainment', 'Lifestyle', 'Business', 'Other'];
const CONTENT_TYPES = ['Video', 'Article', 'Image', 'Podcast', 'Other'];
const REACTIONS = [
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'funny', emoji: '😂', label: 'Funny' },
  { type: 'inspiring', emoji: '👏', label: 'Inspiring' },
];
const TOKEN_KEY = 'creatorStudioToken';
const VIEWER_TOKEN_KEY = 'creatorStudioViewerToken';

async function api(path, { token, ...options } = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Could not reach the server. Check your connection and API URL.');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}).`);
  return payload;
}

function getViewerId() {
  let id = localStorage.getItem('creatorStudioViewer');
  if (!id) {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('creatorStudioViewer', id);
  }
  return id;
}

function formatDate(value, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function BrandMark({ small = false }) {
  return <span className={`brand-mark${small ? ' brand-mark-small' : ''}`}>a.</span>;
}

function AppHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="brand-lockup" aria-label="Creator Studio home">
        <BrandMark />
        <span className="brand-name">the creator&apos;s<br />corner</span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/#stories">Stories</a>
        <a href="/#about">About</a>
        <Link to="/viewer/stories/new" className="nav-creator">Write a story <Pencil size={14} /></Link>
        <Link to="/viewer/account" className="nav-creator">Saved stories <Bookmark size={14} /></Link>
        <Link to="/creator/login" className="nav-creator">Creator studio <ArrowUpRight size={14} /></Link>
      </nav>
    </header>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await api('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
      setEmail('');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor="newsletter-email">A little note when something new is out</label>
      <div><input id="newsletter-email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" /><button className="primary-button" disabled={busy}>{busy ? 'Saving...' : 'Subscribe'} <Mail size={14} /></button></div>
      {message && <span className="newsletter-message" role="status">{message}</span>}
    </form>
  );
}

function ContentArtwork({ content, large = false }) {
  const TypeIcon = content.contentType === 'Podcast' ? Mic2 : content.contentType === 'Article' ? BookOpen : content.contentType === 'Image' ? ImageIcon : content.contentType === 'Video' ? Film : AudioLines;
  if (content.thumbnailUrl) {
    return <img className={`artwork-image${large ? ' artwork-large' : ''}`} src={content.thumbnailUrl} alt="" loading="lazy" />;
  }
  return (
    <div className={`artwork-placeholder artwork-${(content.category || 'other').toLowerCase()}${large ? ' artwork-large' : ''}`}>
      <span className="artwork-index">{content.category || 'Creator notes'}</span>
      <TypeIcon size={large ? 50 : 34} strokeWidth={1.2} />
      <span className="artwork-title">{content.title}</span>
      <span className="artwork-mark">a.</span>
    </div>
  );
}

function ContentCard({ content, index = 0 }) {
  return (
    <Link className="content-card" to={`/content/${content._id}`} style={{ '--card-delay': `${index * 70}ms` }}>
      <div className="card-art">
        <ContentArtwork content={content} />
        <span className="card-type">{content.contentType}</span>
        <span className="card-open"><ArrowUpRight size={17} /></span>
      </div>
      <div className="card-meta"><span>{content.category}</span><span>{formatDate(content.publishedAt, { month: 'short', day: 'numeric' })}</span></div>
      <h3>{content.title}</h3>
      <p>{content.description}</p>
      <div className="card-footer"><span><Eye size={14} /> {(content.views || 0).toLocaleString()}</span><span><Heart size={14} /> {(content.likesCount || 0).toLocaleString()}</span></div>
    </Link>
  );
}

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const query = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || 'All';

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    api(`/contents${params.size ? `?${params}` : ''}`)
      .then(({ contents: result }) => {
        if (active) {
          setContents(result);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [query, selectedCategory]);

  const featured = contents[0];
  const updateQuery = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <AppHeader />
      <main>
        <section className="hero-section" id="about">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A little corner of the internet</div>
            <h1>Ideas made<br /><em>to be shared.</em></h1>
            <p className="hero-intro">{CREATOR_INTRO}</p>
            <a href="#stories" className="text-link">Explore the latest <ArrowDownRight size={17} /></a>
          </div>
          <div className="hero-portrait" aria-label={`${CREATOR_NAME}'s creator profile`}>
            <div className="portrait-backdrop" />
            <div className="portrait-circle"><span>{CREATOR_NAME.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span></div>
            <span className="portrait-note portrait-note-top">curiosity, always</span>
            <span className="portrait-note portrait-note-bottom">{CREATOR_NAME} <span>— creator & collector</span></span>
            <Sparkles className="portrait-spark" size={24} strokeWidth={1.2} />
          </div>
          <div className="hero-side-note">GOOD THINGS<br />TAKE A LITTLE<br />CURIOSITY <ArrowDownRight size={15} /></div>
          <div className="hero-bottom"><span>01 — 04</span><span>SCROLL TO WANDER</span><span>EST. WITH INTENTION</span></div>
        </section>

        <section className="featured-section" aria-label="Featured content">
          <div className="section-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> Handpicked for you</div><h2>A good place<br />to <em>start.</em></h2></div>
            <span className="section-number">01 / FEATURED</span>
          </div>
          {featured ? (
            <Link to={`/content/${featured._id}`} className="featured-panel">
              <div className="featured-visual"><ContentArtwork content={featured} large /><span className="featured-badge">THE LATEST</span></div>
              <div className="featured-info">
                <div className="card-meta"><span>{featured.category}</span><span>{formatDate(featured.publishedAt)}</span></div>
                <h3>{featured.title}</h3>
                <p>{featured.description}</p>
                <span className="round-arrow"><ArrowUpRight size={19} /></span>
                <div className="featured-stats"><span><Eye size={15} /> {(featured.views || 0).toLocaleString()} reads & views</span><span><Heart size={15} /> {(featured.likesCount || 0).toLocaleString()} appreciations</span></div>
              </div>
            </Link>
          ) : (
            <div className="empty-featured">
              <div className="empty-symbol"><Sparkles size={27} strokeWidth={1.4} /></div>
              <div><strong>The next good thing is on its way.</strong><p>Published stories will show up here. Check back soon.</p></div>
            </div>
          )}
        </section>

        <section className="stories-section" id="stories">
          <div className="stories-top">
            <div><div className="eyebrow"><span className="eyebrow-line" /> The collection</div><h2>Out in the <em>world.</em></h2></div>
            <span className="section-number">{contents.length.toString().padStart(2, '0')} STORIES & COUNTING</span>
          </div>
          <div className="discovery-tools">
            <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => updateQuery('q', event.target.value)} placeholder="Search something lovely..." aria-label="Search stories" /><kbd>↵</kbd></label>
            <div className="category-list" role="group" aria-label="Filter by category">
              {CATEGORIES.map((category) => <button key={category} className={selectedCategory === category ? 'category-pill active' : 'category-pill'} onClick={() => updateQuery('category', category)}>{category}</button>)}
            </div>
          </div>
          {error && <div className="notice error-notice">{error}</div>}
          {loading ? <div className="loading-state"><span className="spinner" /> Finding the good stuff...</div> : contents.length ? (
            <div className="content-grid">{contents.map((content, index) => <ContentCard content={content} index={index} key={content._id} />)}</div>
          ) : (
            <div className="empty-state"><div className="empty-symbol"><Search size={24} /></div><h3>No stories found.</h3><p>Try a different search or category. Something might be hiding.</p><button className="quiet-button" onClick={() => setSearchParams({})}>Clear filters <X size={14} /></button></div>
          )}
          <div className="collection-note"><span>COLLECTED WITH CARE</span><span>THERE&apos;S ALWAYS MORE TO DISCOVER <ArrowRight size={14} /></span></div>
        </section>

        <footer className="site-footer">
          <Link to="/" className="brand-lockup"><BrandMark /><span className="brand-name">the creator&apos;s<br />corner</span></Link>
          <p>Made for curious minds,<br />by {CREATOR_NAME}.</p>
          <NewsletterSignup />
          <a href="mailto:hello@example.com" className="footer-link">Say hello <ArrowUpRight size={14} /></a>
          <span className="copyright">© {new Date().getFullYear()} — A SMALL CORNER OF THE INTERNET</span>
        </footer>
      </main>
    </>
  );
}

function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({});
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [reactionBusy, setReactionBusy] = useState(false);

  const loadComments = useCallback(async () => {
    const result = await api(`/comments/${id}`);
    setComments(result.comments);
  }, [id]);

  useEffect(() => {
    let active = true;
    api(`/contents/${id}`)
      .then(({ content: result }) => { if (active) setContent(result); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); });
    api(`/reactions/${id}?viewerId=${encodeURIComponent(getViewerId())}`)
      .then((result) => {
        if (active) {
          setReactionCounts(result.counts);
          setSelectedReaction(result.reaction);
        }
      })
      .catch((requestError) => {
        if (active) setNotice(getErrorMessage(requestError));
      });
    const viewerToken = localStorage.getItem(VIEWER_TOKEN_KEY);
    if (viewerToken) {
      api('/bookmarks', { token: viewerToken })
        .then((result) => {
          if (active) setBookmarked(result.bookmarks.some((bookmark) => bookmark.content._id === id));
        })
        .catch((requestError) => {
          if (active) setNotice(getErrorMessage(requestError));
        });
    }
    loadComments().catch((requestError) => {
      if (active) setNotice(getErrorMessage(requestError));
    });
    return () => { active = false; };
  }, [id, loadComments]);

  const submitComment = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const result = await api('/comments', {
        method: 'POST',
        body: JSON.stringify({ contentId: id, viewerId: getViewerId(), viewerName, message }),
      });
      setNotice(result.message);
      setViewerName('');
      setMessage('');
    } catch (requestError) {
      setNotice(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const likeContent = async () => {
    setBusy(true);
    try {
      const result = await api('/likes', {
        method: 'POST',
        body: JSON.stringify({ contentId: id, viewerId: getViewerId() }),
      });
      setContent((current) => ({ ...current, likesCount: result.likesCount }));
      setLiked(true);
    } catch (requestError) {
      setNotice(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const reactToContent = async (type) => {
    const nextReaction = selectedReaction === type ? null : type;
    setReactionBusy(true);
    setNotice('');
    try {
      const result = await api('/reactions', {
        method: 'POST',
        body: JSON.stringify({ contentId: id, viewerId: getViewerId(), reaction: nextReaction }),
      });
      setReactionCounts(result.counts);
      setSelectedReaction(result.reaction);
    } catch (requestError) {
      setNotice(getErrorMessage(requestError));
    } finally {
      setReactionBusy(false);
    }
  };

  const toggleBookmark = async () => {
    const viewerToken = localStorage.getItem(VIEWER_TOKEN_KEY);
    if (!viewerToken) {
      navigate(`/viewer/account?next=${encodeURIComponent(`/content/${id}`)}`);
      return;
    }
    setBookmarkBusy(true);
    setNotice('');
    try {
      const result = await api(`/bookmarks/${id}`, {
        method: bookmarked ? 'DELETE' : 'POST',
        token: viewerToken,
      });
      setBookmarked(result.saved);
      setNotice(result.saved ? 'Saved to your reading list.' : 'Removed from your saved stories.');
    } catch (requestError) {
      setNotice(getErrorMessage(requestError));
    } finally {
      setBookmarkBusy(false);
    }
  };

  const shareContent = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: content.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Link copied to your clipboard.');
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setNotice('Could not share this link. You can copy it from the address bar.');
    }
  };

  if (error) return <><AppHeader /><main className="detail-page"><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to the collection</Link><div className="notice error-notice">{error}</div></main></>;
  if (!content) return <><AppHeader /><div className="loading-state"><span className="spinner" /> Opening this story...</div></>;

  return (
    <>
      <AppHeader />
      <main className="detail-page">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to the collection</Link>
        <article className="detail-article">
          <div className="detail-meta"><span>{content.category}</span><span>{content.contentType}</span><span>{formatDate(content.publishedAt)}</span></div>
          <h1>{content.title}</h1>
          {content.authorName && <p className="story-author">By {content.authorName}</p>}
          <p className="detail-deck">{content.description}</p>
          <div className="detail-art"><ContentArtwork content={content} large /></div>
          <div className="detail-actions">
            <span><Eye size={16} /> {content.views.toLocaleString()} views</span>
            <button onClick={likeContent} disabled={busy || liked} className={liked ? 'action-button liked' : 'action-button'}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Appreciated' : 'Appreciate'} · {content.likesCount || 0}</button>
            <button onClick={toggleBookmark} disabled={bookmarkBusy} className={bookmarked ? 'action-button liked' : 'action-button'}><Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save for later'}</button>
            <button onClick={shareContent} className="action-button"><Copy size={15} /> Share this</button>
          </div>
          {notice && <p className="form-note" role="status">{notice}</p>}
          <div className="reaction-panel" aria-label="React to this story">
            <span className="reaction-prompt">What did you think?</span>
            <div className="reaction-options">
              {REACTIONS.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  type="button"
                  className={`reaction-button${selectedReaction === type ? ' selected' : ''}`}
                  onClick={() => reactToContent(type)}
                  disabled={reactionBusy}
                  aria-pressed={selectedReaction === type}
                  aria-label={`${label}, ${reactionCounts[type] || 0} reactions`}
                  title={label}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span>{reactionCounts[type] || 0}</span>
                </button>
              ))}
            </div>
          </div>
          {content.articleContent && <div className="article-copy">{content.articleContent.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {content.mediaUrl && <a className="media-link" href={content.mediaUrl} target="_blank" rel="noreferrer">Open the {content.contentType.toLowerCase()} <ArrowUpRight size={17} /></a>}
        </article>
        <section className="comments-section">
          <div className="comments-heading"><div className="eyebrow"><span className="eyebrow-line" /> Keep the conversation going</div><h2>Leave a little <em>note.</em></h2><p>Comments are reviewed before they appear. Be kind, be curious.</p></div>
          <form className="comment-form" onSubmit={submitComment}>
            <label>Your name<input value={viewerName} onChange={(event) => setViewerName(event.target.value)} required maxLength={60} placeholder="What should we call you?" /></label>
            <label>Your comment<textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={1000} rows={4} placeholder="Share a thought..." /></label>
            <button className="primary-button" disabled={busy}>{busy ? 'Sending...' : 'Send for review'} <Send size={15} /></button>
            {notice && <p className="form-note" role="status">{notice}</p>}
          </form>
          <div className="approved-comments">
            <h3><MessageCircle size={16} /> From the community <span>{comments.length}</span></h3>
            {comments.length ? comments.map((comment) => <article className="comment-card" key={comment._id}><div className="comment-avatar">{comment.viewerName.slice(0, 1).toUpperCase()}</div><div><div className="comment-byline"><strong>{comment.viewerName}</strong><time>{formatDate(comment.createdAt, { month: 'short', day: 'numeric' })}</time></div><p>{comment.message}</p></div></article>) : <p className="no-comments">No notes yet. Yours could be the first.</p>}
          </div>
        </section>
      </main>
    </>
  );
}

function ViewerAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [viewer, setViewer] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [stories, setStories] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const token = localStorage.getItem(VIEWER_TOKEN_KEY);
  const nextPath = searchParams.get('next');
  const returnTo = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';

  const loadBookmarks = useCallback(async (viewerToken) => {
    const result = await api('/bookmarks', { token: viewerToken });
    setBookmarks(result.bookmarks);
  }, []);
  const loadStories = useCallback(async (viewerToken) => {
    const result = await api('/viewer-stories/mine', { token: viewerToken });
    setStories(result.contents);
  }, []);

  useEffect(() => {
    if (!token) return;
    api('/viewer-auth/me', { token })
      .then(({ viewer: current }) => {
        setViewer(current);
        return Promise.all([loadBookmarks(token), loadStories(token)]);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, [token, loadBookmarks, loadStories]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(`/viewer-auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      localStorage.setItem(VIEWER_TOKEN_KEY, result.token);
      setViewer(result.viewer);
      await Promise.all([loadBookmarks(result.token), loadStories(result.token)]);
      if (nextPath) navigate(returnTo, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const removeBookmark = async (contentId) => {
    try {
      await api(`/bookmarks/${contentId}`, { method: 'DELETE', token });
      setBookmarks((current) => current.filter((bookmark) => bookmark.content._id !== contentId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const signOut = () => {
    localStorage.removeItem(VIEWER_TOKEN_KEY);
    setViewer(null);
    setBookmarks([]);
    setStories([]);
  };

  const deleteStory = async (story) => {
    if (!window.confirm(`Delete "${story.title}" and its reader activity? This cannot be undone.`)) return;
    try {
      await api(`/viewer-stories/${story._id}`, { method: 'DELETE', token });
      setStories((current) => current.filter((item) => item._id !== story._id));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <>
      <AppHeader />
      <main className="viewer-account-page">
        {viewer ? (
          <>
            <div className="account-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> Your account</div><h1>Welcome back, <em>{viewer.name}.</em></h1><p>Signed in as {viewer.email}</p></div><div className="account-actions"><Link className="primary-button" to="/viewer/stories/new"><Pencil size={15} /> Write a story</Link><button className="quiet-button" onClick={signOut}>Sign out</button></div></div>
            {error && <div className="notice error-notice">{error}</div>}
            <section className="account-section"><div className="stories-top"><div><div className="eyebrow"><span className="eyebrow-line" /> Your contributions</div><h2>Your stories.</h2></div></div>{stories.length ? <div className="content-grid">{stories.map((content, index) => <div className="saved-content" key={content._id}><ContentCard content={content} index={index} /><button className="quiet-button" onClick={() => deleteStory(content)}><Trash2 size={14} /> Delete story</button></div>)}</div> : <div className="empty-state"><div className="empty-symbol"><Pencil size={22} /></div><h3>Your first story is waiting.</h3><p>Write and publish a story for the community.</p><Link className="primary-button" to="/viewer/stories/new">Write a story <ArrowRight size={15} /></Link></div>}</section>
            <section className="account-section"><div className="stories-top"><div><div className="eyebrow"><span className="eyebrow-line" /> Saved for later</div><h2>Your reading list.</h2></div></div>
            {bookmarks.length ? <div className="content-grid">{bookmarks.map(({ content }, index) => <div className="saved-content" key={content._id}><ContentCard content={content} index={index} /><button className="quiet-button" onClick={() => removeBookmark(content._id)}><Bookmark size={14} /> Remove saved story</button></div>)}</div> : <div className="empty-state"><div className="empty-symbol"><Bookmark size={22} /></div><h3>Your list is ready.</h3><p>Open a story and choose “Save for later” to keep it here.</p><Link className="primary-button" to="/">Explore stories <ArrowRight size={15} /></Link></div>}
            </section>
          </>
        ) : (
          <section className="login-card viewer-login-card">
            <div className="eyebrow"><span className="eyebrow-line" /> Save stories for later</div>
            <h1>{mode === 'register' ? 'Make it yours.' : 'Welcome back.'}</h1>
            <p>Create a viewer account or sign in to keep bookmarks synced.</p>
            <form onSubmit={submit}>
              {mode === 'register' && <label>Your name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
              <label>Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              {mode === 'register' && <span className="form-note">Use at least 12 characters.</span>}
              {error && <div className="notice error-notice" role="alert">{error}</div>}
              <button className="primary-button login-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'} <ArrowRight size={15} /></button>
            </form>
            <button className="account-mode-button" onClick={() => { setError(''); setMode(mode === 'register' ? 'login' : 'register'); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create a viewer account'}</button>
            <Link to="/" className="back-link login-back"><ArrowLeft size={15} /> Back to stories</Link>
          </section>
        )}
      </main>
    </>
  );
}

function ViewerStoryPage() {
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Other', thumbnailUrl: '', articleContent: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const token = localStorage.getItem(VIEWER_TOKEN_KEY);

  useEffect(() => {
    if (!token) {
      navigate('/viewer/account?next=%2Fviewer%2Fstories%2Fnew', { replace: true });
      return;
    }
    api('/viewer-auth/me', { token })
      .then(({ viewer: current }) => setViewer(current))
      .catch(() => {
        localStorage.removeItem(VIEWER_TOKEN_KEY);
        navigate('/viewer/account?next=%2Fviewer%2Fstories%2Fnew', { replace: true });
      })
      .finally(() => setReady(true));
  }, [navigate, token]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const uploadCover = async (file) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your cover.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Cover images must be 10 MB or smaller.');
      return;
    }
    setUploadingCover(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api('/uploads/viewer', { method: 'POST', token, body });
      update('thumbnailUrl', result.url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUploadingCover(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { content } = await api('/viewer-stories', {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });
      navigate(`/content/${content._id}`, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (!ready || !viewer) return <><AppHeader /><div className="loading-state"><span className="spinner" /> Opening the story editor...</div></>;

  return (
    <>
      <AppHeader />
      <main className="viewer-account-page">
        <Link to="/viewer/account" className="back-link"><ArrowLeft size={15} /> Back to your account</Link>
        <section className="story-submission-card">
          <div className="eyebrow"><span className="eyebrow-line" /> A story by {viewer.name}</div>
          <h1>Share your <em>story.</em></h1>
          <p>Your story will be published right away and shown with your name.</p>
          <form className="editor-form" onSubmit={submit}>
            <label>Title<input required maxLength={150} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Give your story a title" /></label>
            <label>Short description<textarea required maxLength={5000} rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What is your story about?" /></label>
            <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{CATEGORIES.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Cover photo <span className="optional-label">optional</span><input type="url" maxLength={2048} value={form.thumbnailUrl} onChange={(event) => update('thumbnailUrl', event.target.value)} placeholder="Paste an image URL or upload a photo" /><span className="upload-field"><Upload size={14} /> {uploadingCover ? 'Uploading cover...' : 'Choose cover photo'}<input type="file" accept="image/*" disabled={uploadingCover} onChange={(event) => { uploadCover(event.target.files?.[0]); event.target.value = ''; }} /></span></label>
            {form.thumbnailUrl && <img className="story-cover-preview" src={form.thumbnailUrl} alt="Story cover preview" />}
            <label>Your story<textarea required maxLength={50000} rows={12} value={form.articleContent} onChange={(event) => update('articleContent', event.target.value)} placeholder="Write your story here..." /></label>
            <p className="form-note">Stories are public as soon as you publish. You can delete your story later from your account. Cover photo uploads require the site's image storage to be configured.</p>
            {error && <div className="notice error-notice" role="alert">{error}</div>}
            <div className="modal-actions"><Link to="/viewer/account" className="quiet-button">Cancel</Link><button className="primary-button" disabled={busy || uploadingCover}>{uploadingCover ? 'Uploading cover...' : busy ? 'Publishing...' : 'Publish story'} <Send size={15} /></button></div>
          </form>
        </section>
      </main>
    </>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem(TOKEN_KEY, result.token);
      navigate('/creator', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-top"><Link to="/" className="brand-lockup"><BrandMark /><span className="brand-name">the creator&apos;s<br />corner</span></Link><span className="section-number">PRIVATE STUDIO <span className="secure-dot" /></span></div>
      <div className="login-card">
        <div className="eyebrow"><span className="eyebrow-line" /> Your creative home base</div>
        <h1>Good to have<br />you <em>back.</em></h1>
        <p>Sign in to take care of your corner of the internet.</p>
        <form onSubmit={submit}>
          <label>Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label>
          {error && <div className="notice error-notice" role="alert">{error}</div>}
          <button className="primary-button login-submit" disabled={busy}>{busy ? 'Signing in...' : 'Enter the studio'} <ArrowRight size={16} /></button>
        </form>
        <Link to="/" className="back-link login-back"><ArrowLeft size={15} /> Back to the public site</Link>
      </div>
      <span className="login-foot">A LITTLE SPACE TO MAKE A BIG DIFFERENCE</span>
    </main>
  );
}

function CreatorGuard({ children }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate('/creator/login', { replace: true });
      return;
    }
    api('/auth/me', { token })
      .then(() => setAllowed(true))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        navigate('/creator/login', { replace: true });
      })
      .finally(() => setReady(true));
  }, [navigate]);
  if (!ready) return <div className="loading-state"><span className="spinner" /> Opening your studio...</div>;
  return allowed ? children : null;
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  return <div className={`metric-card metric-${tone}`}><div className="metric-top"><span>{label}</span><Icon size={17} strokeWidth={1.5} /></div><strong>{value ?? 0}</strong><span className="metric-detail">{detail}</span></div>;
}

function ContentEditor({ content, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    title: content?.title || '',
    description: content?.description || '',
    category: content?.category || 'Education',
    contentType: content?.contentType || 'Article',
    thumbnailUrl: content?.thumbnailUrl || '',
    mediaUrl: content?.mediaUrl || '',
    articleContent: content?.articleContent || '',
    status: content?.status || 'draft',
    scheduledAt: content?.scheduledAt ? toLocalDateTime(content.scheduledAt) : '',
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const uploadMedia = async (target, file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api('/uploads', {
        method: 'POST',
        token: localStorage.getItem(TOKEN_KEY),
        body,
      });
      update(target, result.url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const body = { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null };
    try {
      await api(content ? `/contents/${content._id}` : '/contents', {
        method: content ? 'PUT' : 'POST',
        token: localStorage.getItem(TOKEN_KEY),
        body: JSON.stringify(body),
      });
      onSaved();
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-heading">
        <div className="modal-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> Content library</div><h2 id="editor-heading">{content ? 'Make it even' : 'Start something'} <em>better.</em></h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <form className="editor-form" onSubmit={submit}>
          <label>Title<input required maxLength={150} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Give it a good name" /></label>
          <label>Description<textarea required maxLength={5000} rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="A short introduction to your content..." /></label>
          <div className="form-columns">
            <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{CATEGORIES.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Content type<select value={form.contentType} onChange={(event) => update('contentType', event.target.value)}>{CONTENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          </div>
          {content?.createdAt && <p className="editor-created-date">Created {formatDate(content.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          <label>Thumbnail / image URL <span className="optional-label">optional</span><input type="url" maxLength={2048} value={form.thumbnailUrl} onChange={(event) => update('thumbnailUrl', event.target.value)} placeholder="https://..." /><span className="upload-field"><Upload size={14} /> Upload image<input type="file" accept="image/*" disabled={uploading} onChange={(event) => uploadMedia('thumbnailUrl', event.target.files?.[0])} /></span></label>
          <label>Media URL <span className="optional-label">optional</span><input type="url" maxLength={2048} value={form.mediaUrl} onChange={(event) => update('mediaUrl', event.target.value)} placeholder="https://..." /><span className="upload-field"><Upload size={14} /> Upload image, video, or audio<input type="file" accept="image/*,video/*,audio/*" disabled={uploading} onChange={(event) => uploadMedia('mediaUrl', event.target.files?.[0])} /></span></label>
          <label>Article content <span className="optional-label">optional</span><textarea rows={5} maxLength={50000} value={form.articleContent} onChange={(event) => update('articleContent', event.target.value)} placeholder="Write the full text here, if this is an article..." /></label>
          <div className="form-columns status-columns">
            <label>Publishing status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>
            {form.status === 'scheduled' && <label>Publish date &amp; time<input type="datetime-local" required value={form.scheduledAt} onChange={(event) => update('scheduledAt', event.target.value)} /></label>}
          </div>
          {error && <div className="notice error-notice" role="alert">{error}</div>}
          <div className="modal-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || uploading}>{uploading ? 'Uploading media...' : busy ? 'Saving...' : content ? 'Save changes' : 'Add to library'} <Check size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function toLocalDateTime(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function CreatorCalendar({ token }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    api(`/calendar?month=${monthKey}`, { token })
      .then(({ items: result }) => {
        if (active) {
          setItems(result);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      });
    return () => { active = false; };
  }, [monthKey, token]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const events = items.filter((item) => {
      const eventDate = new Date(item.status === 'scheduled' ? item.scheduledAt : item.publishedAt);
      return eventDate.getFullYear() === date.getFullYear()
        && eventDate.getMonth() === date.getMonth()
        && eventDate.getDate() === date.getDate();
    });
    return { day, events };
  });

  return (
    <section className="calendar-view">
      <header className="calendar-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> Publication planner</div><h3>{formatDate(month, { month: 'long', year: 'numeric' })}</h3></div>
        <div><button className="icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><button className="icon-button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div>
      </header>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
        {cells.map((cell, index) => <div className={`calendar-day${cell ? '' : ' outside-month'}`} key={index}>
          {cell && <><span className="calendar-day-number">{cell.day}</span>{cell.events.map((item) => <div className={`calendar-event calendar-${item.status}`} key={item._id}><strong>{item.status === 'scheduled' ? <Clock3 size={11} /> : <Check size={11} />}{item.title}</strong><span>{item.status === 'scheduled' ? 'Scheduled' : 'Published'}</span></div>)}</>}
        </div>)}
      </div>
    </section>
  );
}

function CreatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [contents, setContents] = useState([]);
  const [comments, setComments] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('content');
  const [editorContent, setEditorContent] = useState(undefined);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const token = localStorage.getItem(TOKEN_KEY);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [statsResult, contentResult, commentResult, analyticsResult, notificationResult] = await Promise.all([
        api('/dashboard/stats', { token }),
        api('/contents/manage', { token }),
        api('/comments/manage', { token }),
        api('/dashboard/analytics', { token }),
        api('/notifications', { token }),
      ]);
      setStats(statsResult.stats);
      setContents(contentResult.contents);
      setComments(commentResult.comments);
      setAnalytics(analyticsResult.items);
      setNotifications(notificationResult.notifications);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [token]);
  useEffect(() => { refresh(); }, [refresh]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/creator/login', { replace: true });
  };

  const deleteContent = async (content) => {
    if (!window.confirm(`Delete “${content.title}” and its comments? This cannot be undone.`)) return;
    try {
      await api(`/contents/${content._id}`, { method: 'DELETE', token });
      setNotice('Content removed from your library.');
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const moderateComment = async (comment, action) => {
    try {
      if (action === 'delete') {
        await api(`/comments/${comment._id}`, { method: 'DELETE', token });
      } else {
        await api(`/comments/${comment._id}`, { method: 'PATCH', token, body: JSON.stringify({ status: action }) });
      }
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const pendingCount = useMemo(() => comments.filter((comment) => comment.status === 'pending').length, [comments]);
  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);
  const markNotificationRead = async (notification) => {
    if (notification.readAt) return;
    try {
      await api(`/notifications/${notification._id}/read`, {
        method: 'PATCH',
        token,
      });
      setNotifications((current) => current.map((item) => item._id === notification._id
        ? { ...item, readAt: new Date().toISOString() }
        : item));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };
  const markAllRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST', token });
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="brand-lockup"><BrandMark /><span className="brand-name">the creator&apos;s<br />corner</span></Link>
        <div className="sidebar-label">YOUR STUDIO</div>
        <NavLink to="/creator" end className={({ isActive }) => `sidebar-link${isActive ? ' selected' : ''}`}><LayoutDashboard size={17} /> Overview</NavLink>
        <button className={`sidebar-link${activeTab === 'content' ? ' selected' : ''}`} onClick={() => setActiveTab('content')}><BookOpen size={17} /> Content library<span className="sidebar-count">{contents.length}</span></button>
        <button className={`sidebar-link${activeTab === 'comments' ? ' selected' : ''}`} onClick={() => setActiveTab('comments')}><MessageCircle size={17} /> Comments{pendingCount > 0 && <span className="notification-count">{pendingCount}</span>}</button>
        <button className={`sidebar-link${activeTab === 'calendar' ? ' selected' : ''}`} onClick={() => setActiveTab('calendar')}><CalendarDays size={17} /> Content calendar</button>
        <button className={`sidebar-link${activeTab === 'notifications' ? ' selected' : ''}`} onClick={() => setActiveTab('notifications')}><Bell size={17} /> Notifications{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications}</span>}</button>
        <div className="sidebar-spacer" />
        <div className="sidebar-profile"><div className="profile-avatar">{CREATOR_NAME.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{CREATOR_NAME}</strong><span>Creator account</span></div><button onClick={logout} className="icon-button" aria-label="Log out"><LogOut size={16} /></button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-topbar"><div><span className="eyebrow"><span className="eyebrow-line" /> PRIVATE STUDIO</span><span className="topbar-date">{formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><div className="topbar-actions"><Link to="/" className="preview-link">View your public site <ArrowUpRight size={15} /></Link><button className="primary-button add-content-button" onClick={() => setEditorContent(null)}><Plus size={16} /> New content</button></div></header>
        <div className="dashboard-content">
          <div className="dashboard-welcome"><div><span className="eyebrow">YOUR CONTENT, ALL IN ONE PLACE</span><h1>A little space<br />to <em>make things.</em></h1></div><div className="welcome-sticker"><Sparkles size={19} /><span>make<br />something<br />good</span></div></div>
          {error && <div className="notice error-notice">{error}</div>}
          {notice && <div className="notice success-notice">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
          <section className="metrics-grid">
            <MetricCard label="All content" value={stats?.total} detail="Everything you have made" icon={BookOpen} tone="peach" />
            <MetricCard label="Published" value={stats?.published} detail="Out in the world" icon={Sparkles} tone="lavender" />
            <MetricCard label="Drafts" value={stats?.drafts} detail="Ideas in progress" icon={Pencil} tone="cream" />
            <MetricCard label="Comments" value={stats?.comments} detail={`${stats?.pendingComments || 0} waiting for review`} icon={MessageCircle} tone="sage" />
          </section>
          <section className="analytics-strip">
            <div><span className="analytics-icon"><Eye size={17} /></span><span>ALL-TIME VIEWS</span><strong>{(stats?.views || 0).toLocaleString()}</strong></div>
            <div><span className="analytics-icon"><Heart size={17} /></span><span>APPRECIATIONS</span><strong>{(stats?.likes || 0).toLocaleString()}</strong></div>
            <div><span className="analytics-icon"><CalendarDays size={17} /></span><span>ON THE CALENDAR</span><strong>{stats?.scheduled || 0} <small>scheduled</small></strong></div>
            <div className="top-content-stat"><span className="analytics-icon"><ArrowUpRight size={17} /></span><span>MOST VISITED</span><strong>{stats?.topContent?.title || 'Your next big thing'}</strong></div>
          </section>
          <section className="analytics-table">
            <div className="analytics-table-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> Per-content performance</div><h2>What readers are enjoying.</h2></div></div>
            <div className="analytics-table-scroll"><table><thead><tr><th>Content</th><th>Status</th><th>Views</th><th>Likes</th><th>Comments</th></tr></thead><tbody>
              {analytics.map((item) => <tr key={item._id}><td>{item.title}</td><td>{item.status}</td><td>{item.views.toLocaleString()}</td><td>{item.likesCount.toLocaleString()}</td><td>{item.comments}</td></tr>)}
              {!analytics.length && <tr><td colSpan="5">Your content statistics will appear here.</td></tr>}
            </tbody></table></div>
          </section>
          <section className="management-section">
            <div className="management-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR WORK, ORGANIZED</div><h2>{activeTab === 'content' ? 'The library.' : activeTab === 'comments' ? 'The conversation.' : activeTab === 'calendar' ? 'The calendar.' : 'Your notifications.'}</h2></div><div className="management-tabs"><button className={activeTab === 'content' ? 'tab-active' : ''} onClick={() => setActiveTab('content')}>Content <span>{contents.length}</span></button><button className={activeTab === 'comments' ? 'tab-active' : ''} onClick={() => setActiveTab('comments')}>Comments <span>{comments.length}</span></button><button className={activeTab === 'calendar' ? 'tab-active' : ''} onClick={() => setActiveTab('calendar')}>Calendar</button><button className={activeTab === 'notifications' ? 'tab-active' : ''} onClick={() => setActiveTab('notifications')}>Alerts <span>{unreadNotifications || ''}</span></button></div></div>
            {activeTab === 'content' ? (
              contents.length ? <div className="manage-list">{contents.map((content) => (
                <article className="manage-row" key={content._id}>
                  <div className="manage-thumb"><ContentArtwork content={content} /></div>
                  <div className="manage-title"><strong>{content.title}</strong><span>{content.category} · {content.contentType}</span></div>
                  <span className={`status-tag status-${content.status}`}>{content.status === 'scheduled' ? <Clock3 size={12} /> : content.status === 'published' ? <Check size={12} /> : <Pencil size={12} />}{content.status}</span>
                  <div className="manage-dates">
                    <span className="manage-date"><strong>Created</strong>{formatDate(content.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="manage-date"><strong>{content.status === 'scheduled' ? 'Scheduled' : 'Published'}</strong>{content.status === 'scheduled' ? formatDate(content.scheduledAt, { month: 'short', day: 'numeric', year: 'numeric' }) : content.status === 'published' ? formatDate(content.publishedAt, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not published'}</span>
                  </div>
                  <div className="row-actions"><button onClick={() => setEditorContent(content)} aria-label={`Edit ${content.title}`}><Pencil size={16} /></button><button onClick={() => deleteContent(content)} aria-label={`Delete ${content.title}`}><Trash2 size={16} /></button></div>
                </article>
              ))}</div> : <div className="empty-dashboard"><div className="empty-symbol"><Plus size={22} /></div><strong>A blank page is full of possibility.</strong><p>Add your first piece of content to get started.</p><button className="primary-button" onClick={() => setEditorContent(null)}>Create your first piece <Plus size={15} /></button></div>
            ) : activeTab === 'comments' ? (
              comments.length ? <div className="moderation-list">{comments.map((comment) => (
                <article className="moderation-row" key={comment._id}>
                  <div className="comment-avatar">{comment.viewerName.slice(0, 1).toUpperCase()}</div>
                  <div className="moderation-message"><div className="comment-byline"><strong>{comment.viewerName}</strong><time>{formatDate(comment.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</time><span className={`status-tag status-${comment.status}`}>{comment.status}</span></div><p>{comment.message}</p><small>On: {comment.content?.title || 'Removed content'}</small></div>
                  <div className="moderation-actions">{comment.status === 'pending' && <button className="approve-button" onClick={() => moderateComment(comment, 'approved')}><Check size={14} /> Approve</button>}{comment.status === 'approved' && <button className="quiet-button" onClick={() => moderateComment(comment, 'hidden')}>Hide</button>}{comment.status === 'hidden' && <button className="quiet-button" onClick={() => moderateComment(comment, 'approved')}>Show</button>}<button className="icon-button danger-icon" onClick={() => moderateComment(comment, 'delete')} aria-label="Delete comment"><Trash2 size={16} /></button></div>
                </article>
              ))}</div> : <div className="empty-dashboard"><div className="empty-symbol"><MessageCircle size={22} /></div><strong>It&apos;s quiet for now.</strong><p>Viewer comments will land here for your review.</p></div>
            ) : activeTab === 'calendar' ? (
              <CreatorCalendar token={token} />
            ) : (
              <div className="notification-list">
                <div className="notification-list-heading"><span>{unreadNotifications} unread</span>{unreadNotifications > 0 && <button className="quiet-button" onClick={markAllRead}>Mark all as read</button>}</div>
                {notifications.length ? notifications.map((item) => <article className={`notification-item${item.readAt ? '' : ' unread'}`} key={item._id} onClick={() => markNotificationRead(item)}>
                  <span className="notification-item-icon">{item.type === 'comment' ? <MessageCircle size={16} /> : item.type === 'published' ? <Check size={16} /> : <Heart size={16} />}</span>
                  <div><p>{item.message}</p><small>{formatDate(item.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}{item.content?.title && ` · ${item.content.title}`}</small></div>
                  {!item.readAt && <span className="notification-unread-dot" />}
                </article>) : <div className="empty-dashboard"><div className="empty-symbol"><Bell size={22} /></div><strong>You&apos;re all caught up.</strong><p>New comments and reader interactions will appear here.</p></div>}
              </div>
            )}
          </section>
          <footer className="dashboard-footer"><span>CREATED WITH CARE — FOR CREATORS, BY CREATORS</span><Link to="/">VIEW PUBLIC PAGE <ArrowUpRight size={13} /></Link></footer>
        </div>
      </main>
      {editorContent !== undefined && <ContentEditor content={editorContent} onClose={() => setEditorContent(undefined)} onSaved={refresh} />}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/content/:id" element={<ContentDetail />} />
      <Route path="/viewer/account" element={<ViewerAccountPage />} />
      <Route path="/viewer/stories/new" element={<ViewerStoryPage />} />
      <Route path="/creator/login" element={<LoginPage />} />
      <Route path="/creator" element={<CreatorGuard><CreatorDashboard /></CreatorGuard>} />
      <Route path="*" element={<main className="not-found"><BrandMark /><h1>Looks like a little detour.</h1><p>That page isn&apos;t here, but the good stuff is still waiting.</p><Link className="primary-button" to="/">Back to the collection <ArrowRight size={16} /></Link></main>} />
    </Routes>
  );
}
