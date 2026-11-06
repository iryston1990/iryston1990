import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  LoaderCircle,
  LogIn,
  LogOut,
  Mountain,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ирыстон — Хабӕрттӕ" },
      { name: "description", content: "Ирыстоны хабӕрттӕ — Осетинские новости." },
      { property: "og:title", content: "Ирыстон — Хабӕрттӕ" },
      { property: "og:description", content: "Ирыстоны хабӕрттӕ — Осетинские новости." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MONTHS = [
  "Тъӕнджы мӕй",
  "Ӕртхъирӕны мӕй",
  "Тӕргӕйтты мӕй",
  "Хуымгӕнӕны мӕй",
  "Сыфтӕрты мӕй",
  "Хурхӕтӕны мӕй",
  "Сусӕны мӕй",
  "Майрӕмы мӕй",
  "Рухӕны мӕй",
  "Кӕфты мӕй",
  "Уастырджыйы мӕй",
  "Цыппурсы мӕй",
];

function formatDate(value: string) {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
}

const OWNER_EMAIL = "iryston1990@gmail.com";
const OWNER_PASSWORD = "iryston1990";
const NEWS_COLUMNS = "id, title, body, author_id, status, created_at";

type NewsItem = {
  id: string;
  title: string;
  body: string;
  author_id: string | null;
  status: string;
  created_at: string;
};

async function fetchNews(status: "approved" | "pending"): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select(NEWS_COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw new Error("fetch failed");
  return (data ?? []) as NewsItem[];
}

async function createNews(title: string, body: string) {
  const { error } = await supabase.from("news").insert({ title, body });
  if (error) throw new Error("create failed");
}

async function approveNews(id: string) {
  const { data, error } = await supabase
    .from("news")
    .update({ status: "approved" })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) throw new Error("approve failed");
}

async function deleteNews(id: string) {
  const { data, error } = await supabase.from("news").delete().eq("id", id).select("id");
  if (error || !data?.length) throw new Error("delete failed");
}

function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadOwner = async (userId: string | null) => {
      if (!userId) {
        setIsOwner(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_owner")
        .eq("id", userId)
        .maybeSingle();
      if (active) setIsOwner(!error && data?.is_owner === true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setTimeout(() => void loadOwner(s?.user.id ?? null), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadOwner(data.session?.user.id ?? null);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isOwner, loading };
}

const outlineBtn =
  "inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:border-input-hover hover:bg-secondary";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover";
const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-foreground outline-none transition placeholder:text-placeholder focus:border-primary-ring focus:ring-2 focus:ring-danger-ring";
const submitBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";
const ghostDangerBtn =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-mute transition hover:bg-danger-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60";
const errorBox = "rounded-lg bg-danger-soft px-3 py-2 text-sm text-primary";

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <LoaderCircle className={`${className} animate-spin`} />;
}

function Header(props: {
  signedIn: boolean;
  isOwner: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  onAddNews: () => void;
  onModeration: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
          <Mountain className="h-6 w-6 text-primary" />
          Ирыстон
        </a>
        <nav className="flex flex-wrap items-center gap-2">
          {props.signedIn && props.isOwner && (
            <button type="button" onClick={props.onModeration} className={outlineBtn}>
              <ShieldCheck className="h-4 w-4" />
              Фидар кӕны
            </button>
          )}
          <button type="button" onClick={props.onAddNews} className={primaryBtn}>
            <Plus className="h-4 w-4" />
            Хабӕрттӕ бахӕсс
          </button>
          {props.signedIn ? (
            <button type="button" onClick={props.onSignOut} className={outlineBtn}>
              <LogOut className="h-4 w-4" />
              Рахиз
            </button>
          ) : (
            <>
              <button type="button" onClick={props.onSignIn} className={outlineBtn}>
                <LogIn className="h-4 w-4" />
                Бахиз
              </button>
              <button type="button" onClick={props.onSignUp} className={outlineBtn}>
                <UserPlus className="h-4 w-4" />
                Дӕхи бафысс
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-[60vh] items-end overflow-hidden bg-hero-base">
      <img src="/iryston.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-hero/90 via-hero/40 to-transparent" />
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16">
        <h1 className="text-5xl font-bold leading-[1.2] tracking-tight text-primary-foreground drop-shadow-lg sm:text-7xl">
          Ирыстон
        </h1>
      </div>
    </section>
  );
}

function NewsCard(props: {
  item: NewsItem;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md sm:p-8">
      <time dateTime={props.item.created_at} className="text-sm font-medium text-primary">
        {formatDate(props.item.created_at)}
      </time>
      <h3 className="mt-2 text-2xl font-bold leading-[1.2] text-foreground">{props.item.title}</h3>
      <p className="mt-4 whitespace-pre-line leading-[1.5] text-ink-soft">{props.item.body}</p>
      {props.canDelete && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={props.onDelete}
            disabled={props.deleting}
            className={ghostDangerBtn}
          >
            {props.deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
            Айсын
          </button>
        </div>
      )}
    </article>
  );
}

function NewsList(props: {
  refreshKey: number;
  userId: string | null;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchNews("approved").then(
      (rows) => {
        if (active) {
          setItems(rows);
          setState("ready");
        }
      },
      () => active && setState("error"),
    );
    return () => {
      active = false;
    };
  }, [props.refreshKey]);

  async function handleDelete(item: NewsItem) {
    if (!window.confirm("Удалить новость?")) return;
    setDeletingId(item.id);
    setError(null);
    try {
      await deleteNews(item.id);
      props.onChanged();
    } catch {
      setError("Не удалось удалить новость. Попробуйте ещё раз");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (state === "error") {
    return (
      <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-center text-primary">
        Не удалось загрузить новости
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">Хабӕрттӕ дзы нырма нӕй</p>;
  }
  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-center text-primary">
          {error}
        </p>
      )}
      {items.map((item) => (
        <NewsCard
          key={item.id}
          item={item}
          canDelete={props.isOwner || (props.userId !== null && item.author_id === props.userId)}
          deleting={deletingId === item.id}
          onDelete={() => void handleDelete(item)}
        />
      ))}
    </div>
  );
}

function Modal(props: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-hero/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-card shadow-2xl ${props.wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{props.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Фесафын"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{props.children}</div>
      </div>
    </div>
  );
}

function authErrorMessage(message: string) {
  const m = message.toLowerCase();
  if (
    m.includes("database error") ||
    m.includes("registration is closed") ||
    m.includes("signups not allowed")
  )
    return "Дӕхи баффысын нал ис гӕнӕн";
  if (m.includes("already registered")) return "Этот email уже зарегистрирован";
  if (m.includes("email not confirmed")) return "Подтвердите email по ссылке из письма";
  if (m.includes("invalid login credentials")) return "Неверный email или пароль";
  if (m.includes("password")) return "Пароль должен содержать не менее 6 символов";
  return "Не удалось выполнить вход. Попробуйте ещё раз";
}

type AuthMode = "signin" | "signup";

function AuthModal(props: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = props.mode === "signup";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== OWNER_EMAIL || password !== OWNER_PASSWORD) {
      setError(isSignUp ? "Дӕхи баффысын нал ис гӕнӕн" : "Неверный email или пароль");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) throw signInError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      props.onClose();
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isSignUp ? "Дӕхи бафысс" : "Бахиз"} onClose={props.onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Дӕгъӕл</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        {error && (
          <p role="alert" className={errorBox}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={submitBtn}>
          {busy && <Spinner />}
          {isSignUp ? "Дӕхи бафысс" : "Бахиз"}
        </button>
        <p className="text-center text-sm text-ink-mute">
          {isSignUp ? "Дӕхи баффыстай?" : "Дӕхи нырма баффыстай?"}{" "}
          <button
            type="button"
            onClick={() => props.onModeChange(isSignUp ? "signin" : "signup")}
            className="font-semibold text-primary transition hover:text-primary-deep"
          >
            {isSignUp ? "Бахиз" : "Дӕхи баффыс"}
          </button>
        </p>
      </form>
    </Modal>
  );
}

function AddNewsModal(props: { onClose: () => void; onSubmitted: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setError("Заполните заголовок и текст новости");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createNews(t, b);
      props.onSubmitted();
    } catch {
      setError("Не удалось отправить новость. Попробуйте ещё раз");
      setBusy(false);
    }
  }

  return (
    <Modal title="Хабӕрттӕ бахӕсс" onClose={props.onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Сæр</span>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Ныхас</span>
          <textarea
            required
            rows={8}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputCls} resize-y leading-[1.5]`}
          />
        </label>
        {error && (
          <p role="alert" className={errorBox}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={submitBtn}>
          {busy && <Spinner />}
          Арвит
        </button>
      </form>
    </Modal>
  );
}

function ModerationModal(props: { onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await fetchNews("pending"));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: () => Promise<void>, failMessage: string) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setItems((prev) => prev.filter((i) => i.id !== id));
      props.onChanged();
    } catch {
      setError(failMessage);
    } finally {
      setBusyId(null);
    }
  }

  let content: ReactNode;
  if (state === "loading") {
    content = (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Spinner className="h-6 w-6" />
      </div>
    );
  } else if (state === "error") {
    content = (
      <p role="alert" className={`${errorBox} text-center`}>
        Не удалось загрузить новости
      </p>
    );
  } else if (items.length === 0) {
    content = <p className="py-12 text-center text-muted-foreground">Хабӕрттӕ фидар нӕма цӕуынц</p>;
  } else {
    content = (
      <ul className="space-y-4">
        {items.map((item) => {
          const busy = busyId === item.id;
          return (
            <li key={item.id} className="rounded-xl border border-border p-5">
              <time dateTime={item.created_at} className="text-sm font-medium text-primary">
                {formatDate(item.created_at)}
              </time>
              <h3 className="mt-1 text-lg font-bold leading-[1.2] text-foreground">{item.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-[1.5] text-ink-soft">
                {item.body}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={ghostDangerBtn}
                  onClick={() =>
                    window.confirm("Удалить новость?") &&
                    void act(
                      item.id,
                      () => deleteNews(item.id),
                      "Не удалось удалить новость. Попробуйте ещё раз",
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Айсын
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`}
                  onClick={() =>
                    void act(item.id, () => approveNews(item.id), "Не удалось утвердить новость")
                  }
                >
                  {busy ? <Spinner /> : <Check className="h-4 w-4" />}
                  Сӕвӕрын
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Modal title="Фидар кӕны" onClose={props.onClose} wide>
      {error && (
        <p role="alert" className={`mb-4 ${errorBox}`}>
          {error}
        </p>
      )}
      {content}
    </Modal>
  );
}

function Index() {
  const { session, isOwner, loading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const signedIn = session !== null;
  const userId = session?.user.id ?? null;
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!signedIn) setModerationOpen(false);
  }, [signedIn]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setNotice("Не удалось выйти. Попробуйте ещё раз");
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Header
        signedIn={signedIn}
        isOwner={isOwner}
        onSignIn={() => setAuthMode("signin")}
        onSignUp={() => setAuthMode("signup")}
        onAddNews={() => setAddOpen(true)}
        onModeration={() => setModerationOpen(true)}
        onSignOut={() => void handleSignOut()}
      />
      <Hero />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {notice && (
          <p
            role="status"
            className="animate-fade-in mb-8 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-center text-success-ink"
          >
            {notice}
          </p>
        )}
        {!loading && (
          <NewsList refreshKey={refreshKey} userId={userId} isOwner={isOwner} onChanged={refresh} />
        )}
      </main>
      {authMode && (
        <AuthModal mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />
      )}
      {addOpen && (
        <AddNewsModal
          onClose={() => setAddOpen(false)}
          onSubmitted={() => {
            setAddOpen(false);
            setNotice("Хабар фидар кӕнын цӕуы");
          }}
        />
      )}
      {moderationOpen && isOwner && (
        <ModerationModal onClose={() => setModerationOpen(false)} onChanged={refresh} />
      )}
    </div>
  );
}
