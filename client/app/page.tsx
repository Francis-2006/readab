
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "./components/AuthGuard";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  cover_image: string | null;
};

type BooksResponse = {
  page: number;
  limit: number;
  total: number;
  results: Book[];
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [userError, setUserError] = useState("");
  const [booksError, setBooksError] = useState("");
  const [search, setSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [userResult, booksResult] = await Promise.allSettled([
        fetch(`${API_URL}/me`, { headers }),
        fetch(`${API_URL}/books`, { headers }),
      ]);

      if (userResult.status === "fulfilled") {
        try {
          if (!userResult.value.ok) {
            throw new Error();
          }
          setUser(await userResult.value.json());
        } catch {
          setUserError("Unable to load your account details.");
        }
      } else {
        setUserError("Unable to connect to your account.");
      }

      if (booksResult.status === "fulfilled") {
        try {
          if (!booksResult.value.ok) {
            throw new Error();
          }
          const data: BooksResponse = await booksResult.value.json();
          setBooks(data.results ?? []);
        } catch {
          setBooksError("Unable to load books. Please try again.");
        }
      } else {
        setBooksError("Unable to connect to the books service.");
      }

      setLoadingUser(false);
      setLoadingBooks(false);
    }

    fetchData();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      localStorage.removeItem("access_token");
      router.replace("/auth/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    })
    : "";

  const currency = (price: number) =>
    new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f7f5ef] text-[#202c25]">
        {/* Header */}
        <header className="border-b border-[#e7e4da] bg-[#fbfaf6]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#244a38] text-lg font-semibold text-white">
                R
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">Readab</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#7c837a]">
                  The reading room
                </p>
              </div>
            </a>

            <div className="hidden items-center gap-2 rounded-full border border-[#e5e2d8] bg-white px-4 py-2 text-xs text-[#72786f] sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#60846a]" />
              Your personal library
            </div>

            <div className="flex items-center gap-3">
              {!loadingUser && user && (
                <div
                  title={user.username}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e9dc] text-sm font-semibold text-[#244a38]"
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-[#dddcd1] px-4 py-2.5 text-sm font-medium text-[#244a38] transition hover:border-[#244a38] hover:bg-[#244a38] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </header>

        {logoutError && (
          <div
            role="alert"
            className="mx-auto mt-4 max-w-7xl rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
          >
            {logoutError}
          </div>
        )}

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:px-12">
          {/* Welcome section */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#244a38] px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 sm:right-10 sm:h-80 sm:w-80" />
            <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-white/10 sm:right-20 sm:h-64 sm:w-64" />

            <div className="relative max-w-2xl">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[#c5d5c3]">
                A space for your next chapter
              </p>

              {loadingUser ? (
                <div className="h-10 w-56 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
                  Welcome back,{" "}
                  <span className="font-serif italic text-[#d6dfc9]">
                    {user.username}
                  </span>
                  .
                </h1>
              ) : (
                <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
                  Your next chapter starts here.
                </h1>
              )}

              <p className="mt-4 max-w-lg text-sm leading-7 text-[#d0d9d0] sm:text-base">
                Good books make room for new ideas. Find something worth
                spending time with.
              </p>

              <a
                href="#books"
                className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#f1eee4] px-5 py-3 text-sm font-semibold text-[#244a38] transition hover:bg-white"
              >
                Explore the collection
                <span aria-hidden="true">↘</span>
              </a>
            </div>
          </section>

          {/* Account details */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#82877e]">
                Your account
              </p>
              {loadingUser ? (
                <div className="mt-4 h-6 w-32 animate-pulse rounded bg-[#e9e7df]" />
              ) : user ? (
                <p className="mt-3 text-lg font-semibold">{user.username}</p>
              ) : (
                <p className="mt-3 text-sm text-red-700">
                  {userError || "Account details unavailable."}
                </p>
              )}
              <p className="mt-1 text-sm text-[#858980]">Reader profile</p>
            </div>

            <div className="rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#82877e]">
                Member since
              </p>
              {loadingUser ? (
                <div className="mt-4 h-6 w-36 animate-pulse rounded bg-[#e9e7df]" />
              ) : user ? (
                <p className="mt-3 text-lg font-semibold">{joinedDate}</p>
              ) : (
                <p className="mt-3 text-sm text-[#858980]">Not available</p>
              )}
              <p className="mt-1 text-sm text-[#858980]">
                Your reading journey began
              </p>
            </div>
          </section>

          {/* Books */}
          <section id="books" className="scroll-mt-8 pt-14">
            <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7d8579]">
                  Curated for curious minds
                </p>
                <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
                  The collection
                </h2>
                <p className="mt-2 text-sm text-[#7c8178]">
                  Discover your next great read.
                </p>
              </div>

              <label className="flex w-full items-center gap-3 rounded-full border border-[#e4e1d7] bg-[#fbfaf6] px-4 py-3 sm:max-w-xs">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 shrink-0 text-[#858980]"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="m16 16 4 4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles or authors"
                  aria-label="Search books"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a9b92]"
                />
              </label>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[#7c8178]">
                {loadingBooks
                  ? "Finding your books..."
                  : `${filteredBooks.length} ${filteredBooks.length === 1 ? "book" : "books"
                  }`}
              </p>
              <span className="text-xs uppercase tracking-[0.16em] text-[#858980]">
                Readab library
              </span>
            </div>

            {loadingBooks ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-64 animate-pulse rounded-2xl border border-[#e8e5db] bg-[#eeece4]"
                  />
                ))}
              </div>
            ) : booksError ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-700">
                {booksError}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9d7cc] bg-[#fbfaf6] px-6 py-16 text-center">
                <p className="font-serif text-2xl">
                  {books.length === 0 ? "Your shelves are waiting." : "No matches found."}
                </p>
                <p className="mt-2 text-sm text-[#81867d]">
                  {books.length === 0
                    ? "Books added to the library will appear here."
                    : "Try another book title or author."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBooks.map((book, index) => (
                  <article
                    key={book.id}
                    className="group flex min-h-64 flex-col rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#c4cebd] hover:shadow-lg hover:shadow-[#283b2c]/5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {book.cover_image ? (
                        <img
                          src={book.cover_image}
                          alt={`Cover of ${book.title}`}
                          className="h-36 w-24 rounded-lg object-cover shadow-md shadow-black/10"
                        />
                      ) : (
                        <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg border border-[#dce1d4] bg-[#e9ecdf] px-2 text-center">
                          <span className="font-serif text-sm leading-5 text-[#45604a]">
                            {book.title}
                          </span>
                        </div>
                      )}

                      <span className="rounded-full border border-[#e6e3d9] px-3 py-1 text-[10px] tracking-[0.15em] text-[#858980]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-5 flex-1">
                      <h3 className="font-serif text-xl leading-snug tracking-tight">
                        {book.title}
                      </h3>
                      <p className="mt-2 text-sm text-[#7c8178]">
                        by {book.author}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#e9e6dd] pt-4">
                      <span className="text-[10px] uppercase tracking-[0.17em] text-[#858980]">
                        Price
                      </span>
                      <span className="text-sm font-semibold text-[#244a38]">
                        {currency(book.price)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-[#e5e2d8] pt-6 text-xs text-[#858980] sm:flex-row">
            <p className="font-medium tracking-wide">READAB</p>
            <p>A little time with a book goes a long way.</p>
          </footer>
        </div>
      </main>
    </AuthGuard>
  );
}