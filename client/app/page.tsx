
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  LoaderCircle,
  LogOut,
  Package,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import AuthGuard from "./components/AuthGuard";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// Update this URL if your FastAPI payment route uses another path.
const PAYMENT_INIT_URL = `${API_URL}/payments/initialize`;

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

type CartItem = {
  id?: number;
  book_id: number;
  quantity: number;
  book?: Book | null;
  title?: string;
  author?: string;
  price?: number;
  cover_image?: string | null;
};

type CartResponse = {
  items: CartItem[];
  item_count: number;
  total: number;
};

type OrderResponse = {
  message: string;
  order_id: number;
  status: string;
  total_amount: number;
  created_at: string;
  items: {
    book_id: number;
    title: string;
    price: number;
    quantity: number;
    line_total: number;
  }[];
};

type PaymentInitResponse = {
  authorization_url?: string;
  payment_url?: string;
  data?: {
    authorization_url?: string;
    payment_url?: string;
  };
};

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem("access_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;

    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: { msg?: string }) => item.msg)
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // The response wasn't JSON.
  }

  return `${fallback} (HTTP ${response.status})`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(price) ? price : 0);
}

function getItemBook(item: CartItem, books: Book[]): Book {
  if (item.book) return item.book;

  const matchingBook = books.find((book) => book.id === item.book_id);
  if (matchingBook) return matchingBook;

  return {
    id: item.book_id,
    title: item.title || `Book #${item.book_id}`,
    author: item.author || "Author unavailable",
    price: Number(item.price ?? 0),
    cover_image: item.cover_image ?? null,
  };
}

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [booksError, setBooksError] = useState("");
  const [search, setSearch] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const [addingBookId, setAddingBookId] = useState<number | null>(null);
  const [removingBookId, setRemovingBookId] = useState<number | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  // Load the account and book collection.
  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      const headers = getAuthHeaders();

      const [userResult, booksResult] = await Promise.allSettled([
        fetch(`${API_URL}/me`, { headers }),
        fetch(`${API_URL}/books`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (cancelled) return;

      if (userResult.status === "fulfilled") {
        try {
          if (!userResult.value.ok) {
            throw new Error(
              await getErrorMessage(
                userResult.value,
                "Unable to load your account"
              )
            );
          }

          const data: User = await userResult.value.json();

          if (!cancelled) {
            setUser(data);
            setUserError("");
          }
        } catch (error) {
          if (!cancelled) {
            setUserError(
              error instanceof Error
                ? error.message
                : "Unable to load your account."
            );
          }
        }
      } else {
        setUserError("Unable to connect to your account.");
      }

      if (booksResult.status === "fulfilled") {
        try {
          if (!booksResult.value.ok) {
            throw new Error(
              await getErrorMessage(
                booksResult.value,
                "Unable to load books"
              )
            );
          }

          const data: BooksResponse = await booksResult.value.json();

          if (!cancelled) {
            setBooks(Array.isArray(data.results) ? data.results : []);
            setBooksError("");
          }
        } catch (error) {
          if (!cancelled) {
            setBooksError(
              error instanceof Error
                ? error.message
                : "Unable to load books."
            );
          }
        }
      } else {
        setBooksError("Unable to connect to the books service.");
      }

      if (!cancelled) {
        setLoadingUser(false);
        setLoadingBooks(false);
      }
    }

    void fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // GET /cart
  const loadCart = useCallback(async () => {
    setLoadingCart(true);
    setCartError("");

    try {
      const response = await fetch(`${API_URL}/cart`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to load your cart")
        );
      }

      const data: CartResponse = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];

      setCart(items);
      setCartTotal(Number(data.total ?? 0));
      setCartItemCount(
        Number(
          data.item_count ??
            items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            )
        )
      );
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Unable to load your cart."
      );
    } finally {
      setLoadingCart(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  // Escape closes the cart drawer.
  useEffect(() => {
    if (!cartOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCartOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  // POST /cart
  async function handleAddToCart(book: Book) {
    setAddingBookId(book.id);
    setCartError("");

    try {
      const response = await fetch(`${API_URL}/cart`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          book_id: book.id,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to add this book")
        );
      }

      await loadCart();
      setCartOpen(true);
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to add this book to your cart."
      );
      setCartOpen(true);
    } finally {
      setAddingBookId(null);
    }
  }

  // DELETE /cart/{book_id}
  async function handleRemoveFromCart(bookId: number) {
    setRemovingBookId(bookId);
    setCartError("");

    try {
      const response = await fetch(`${API_URL}/cart/${bookId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to remove this book")
        );
      }

      await loadCart();
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to remove this book from your cart."
      );
    } finally {
      setRemovingBookId(null);
    }
  }

  // POST /orders, then initialize Paystack payment.
  async function handleCheckout() {
    if (creatingOrder || loadingCart || cart.length === 0) return;

    setCreatingOrder(true);
    setCartError("");

    const headers: HeadersInit = {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    };

    try {
      let orderId = pendingOrderId;

      // Reuse an order if it was created but payment initialization failed.
      if (orderId === null) {
        const orderResponse = await fetch(`${API_URL}/orders`, {
          method: "POST",
          headers,
          cache: "no-store",
        });

        if (!orderResponse.ok) {
          throw new Error(
            await getErrorMessage(orderResponse, "Unable to create your order")
          );
        }

        const order: OrderResponse = await orderResponse.json();

        if (
          !Number.isInteger(Number(order.order_id)) ||
          Number(order.order_id) <= 0
        ) {
          throw new Error("The server did not return a valid order ID.");
        }

        orderId = Number(order.order_id);
        setPendingOrderId(orderId);
      }

      const paymentResponse = await fetch(PAYMENT_INIT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ order_id: orderId }),
        cache: "no-store",
      });

      if (!paymentResponse.ok) {
        throw new Error(
          `Order #${orderId} was created, but payment could not be started. ` +
            (await getErrorMessage(
              paymentResponse,
              "Please try again."
            ))
        );
      }

      const payment: PaymentInitResponse = await paymentResponse.json();

      const authorizationUrl =
        payment.authorization_url ??
        payment.payment_url ??
        payment.data?.authorization_url ??
        payment.data?.payment_url;

      if (!authorizationUrl) {
        throw new Error(
          `Order #${orderId} was created, but the payment response did not include a checkout URL.`
        );
      }

      let checkoutUrl: URL;

      try {
        checkoutUrl = new URL(authorizationUrl);
      } catch {
        throw new Error("The server returned an invalid payment URL.");
      }

      if (
        checkoutUrl.protocol !== "https:" ||
        !(
          checkoutUrl.hostname === "paystack.com" ||
          checkoutUrl.hostname.endsWith(".paystack.com")
        )
      ) {
        throw new Error(
          "The server returned an unexpected payment URL. Please contact support."
        );
      }

      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Checkout failed. Please try again."
      );
      setCreatingOrder(false);
    }
  }

  // POST /logout
  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Logout failed"));
      }

      localStorage.removeItem("access_token");
      router.replace("/auth/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again."
      );
      setLoggingOut(false);
    }
  }

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f7f5ef] text-[#202c25]">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[#e7e4da] bg-[#fbfaf6]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
            <a href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#244a38] text-lg font-semibold text-white">
                R
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">Readab</p>
                <p className="hidden text-[10px] uppercase tracking-[0.22em] text-[#7c837a] sm:block">
                  The reading room
                </p>
              </div>
            </a>

            <div className="hidden items-center gap-2 rounded-full border border-[#e5e2d8] bg-white px-4 py-2 text-xs text-[#72786f] md:flex">
              <span className="h-2 w-2 rounded-full bg-[#60846a]" />
              Your personal library
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="inline-flex items-center gap-2 rounded-full border border-[#dddcd1] px-3 py-2.5 text-xs font-medium text-[#244a38] transition hover:border-[#244a38] hover:bg-[#f0f2eb] sm:px-4 sm:text-sm"
              >
                <Package className="h-4 w-4" />
                <span>My orders</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCartOpen(true);
                  void loadCart();
                }}
                aria-label={`Open cart, ${cartItemCount} items`}
                className="relative flex h-10 items-center gap-2 rounded-full border border-[#dddcd1] bg-white px-3 text-sm font-medium text-[#244a38] transition hover:border-[#244a38] hover:bg-[#f0f2eb] sm:px-4"
              >
                <ShoppingBag className="h-5 w-5" />
                <span className="hidden sm:inline">Cart</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#244a38] px-1 text-[10px] font-semibold text-white">
                  {cartItemCount}
                </span>
              </button>

              {!loadingUser && user && (
                <div
                  title={user.username}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4e9dc] text-sm font-semibold text-[#244a38]"
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Log out"
                className="inline-flex items-center gap-2 rounded-full border border-[#dddcd1] px-3 py-2.5 text-xs font-medium text-[#244a38] transition hover:border-[#244a38] hover:bg-[#244a38] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                {loggingOut ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {loggingOut ? "Logging out..." : "Log out"}
                </span>
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

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-12">
          {/* Welcome banner */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#244a38] px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 sm:right-10 sm:h-80 sm:w-80" />
            <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-white/10 sm:right-20 sm:h-64 sm:w-64" />
            <div className="pointer-events-none absolute -bottom-32 right-20 h-64 w-64 rounded-full bg-white/[0.03] blur-2xl" />

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
                <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
          </section>

          {/* Account overview */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#82877e]">
                <UserRound className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-[0.16em]">
                  Your account
                </p>
              </div>

              {loadingUser ? (
                <div className="mt-4 h-6 w-32 animate-pulse rounded bg-[#e9e7df]" />
              ) : user ? (
                <>
                  <p className="mt-3 text-lg font-semibold">{user.username}</p>
                  <p className="mt-1 break-all text-sm text-[#858980]">
                    {user.email}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-red-700">
                  {userError || "Account details unavailable."}
                </p>
              )}

              <p className="mt-3 text-sm text-[#858980]">Reader profile</p>
            </div>

            <div className="rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#82877e]">
                <Clock3 className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-[0.16em]">
                  Member since
                </p>
              </div>

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

          {/* Book collection */}
          <section id="books" className="scroll-mt-28 pt-14">
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
                <Search className="h-4 w-4 shrink-0 text-[#7c8178]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles or authors"
                  aria-label="Search books"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a9b92]"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="text-xs text-[#858980] hover:text-[#244a38]"
                  >
                    Clear
                  </button>
                )}
              </label>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[#7c8178]">
                {loadingBooks
                  ? "Finding your books..."
                  : `${filteredBooks.length} ${
                      filteredBooks.length === 1 ? "book" : "books"
                    }`}
              </p>
              <span className="text-xs uppercase tracking-[0.16em] text-[#858980]">
                Readab library
              </span>
            </div>

            {booksError && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                <p>{booksError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 font-semibold underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            )}

            {loadingBooks ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-80 animate-pulse rounded-2xl border border-[#e8e5db] bg-[#eeece4]"
                  />
                ))}
              </div>
            ) : !booksError && filteredBooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9d7cc] bg-[#fbfaf6] px-6 py-16 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-[#82917e]" />
                <p className="mt-4 font-serif text-2xl">
                  {books.length === 0
                    ? "Your shelves are waiting."
                    : "No matches found."}
                </p>
                <p className="mt-2 text-sm text-[#81867d]">
                  {books.length === 0
                    ? "Books added to the library will appear here."
                    : "Try another book title or author."}
                </p>
              </div>
            ) : (
              !booksError && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBooks.map((book, index) => {
                    const alreadyInCart = cart.some(
                      (item) => item.book_id === book.id
                    );

                    return (
                      <article
                        key={book.id}
                        className="group flex min-h-[390px] flex-col rounded-2xl border border-[#e8e5db] bg-[#fbfaf6] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#c4cebd] hover:shadow-lg hover:shadow-[#283b2c]/5 sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {book.cover_image ? (
                            <img
                              src={book.cover_image}
                              alt={`Cover of ${book.title}`}
                              className="h-40 w-28 shrink-0 rounded-lg object-cover shadow-md shadow-black/10"
                            />
                          ) : (
                            <div className="flex h-40 w-28 shrink-0 items-center justify-center rounded-lg border border-[#dce1d4] bg-[#e9ecdf] px-3 text-center">
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
                          <div>
                            <span className="block text-[10px] uppercase tracking-[0.17em] text-[#858980]">
                              Price
                            </span>
                            <span className="mt-1 block text-base font-semibold text-[#244a38]">
                              {formatPrice(book.price)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddToCart(book)}
                            disabled={addingBookId === book.id}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244a38] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#315c46] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                          >
                            {addingBookId === book.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : alreadyInCart ? (
                              <ShoppingBag className="h-4 w-4" />
                            ) : (
                              <ShoppingBag className="h-4 w-4" />
                            )}
                            {addingBookId === book.id
                              ? "Adding..."
                              : alreadyInCart
                                ? "Add another"
                                : "Add to cart"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            )}
          </section>

          <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-[#e5e2d8] pt-6 text-xs text-[#858980] sm:flex-row">
            <p className="font-medium tracking-wide">READAB</p>
            <p>A little time with a book goes a long way.</p>
          </footer>
        </div>

        {/* Cart backdrop */}
        <button
          type="button"
          aria-label="Close shopping cart"
          tabIndex={cartOpen ? 0 : -1}
          onClick={() => setCartOpen(false)}
          className={`fixed inset-0 z-40 cursor-default bg-[#14251b]/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            cartOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        {/* Cart drawer */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          aria-hidden={!cartOpen}
          className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#e8e5db] bg-[#fbfaf6] shadow-2xl shadow-black/10 transition-transform duration-300 ease-in-out ${
            cartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e8e5db] px-5 py-5 sm:px-7">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7d8579]">
                Your selection
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#202c25]">
                Shopping cart
              </h2>
              <p className="mt-1 text-xs text-[#858980]">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"} in
                your cart
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              aria-label="Close cart"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e3e0d6] text-[#244a38] transition hover:bg-[#e9ecdf]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {cartError && (
            <div
              role="alert"
              className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7"
            >
              <p>{cartError}</p>
              <button
                type="button"
                onClick={() => void loadCart()}
                className="mt-2 font-semibold underline underline-offset-4"
              >
                Retry loading cart
              </button>

              {pendingOrderId !== null && (
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="ml-4 mt-2 font-semibold underline underline-offset-4"
                >
                  View order #{pendingOrderId}
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            {loadingCart && cart.length === 0 ? (
              <div className="space-y-4">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-2xl bg-[#eeece4]"
                  />
                ))}
              </div>
            ) : cart.length === 0 ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e9ecdf] text-[#244a38]">
                  <ShoppingBag className="h-9 w-9" />
                </div>
                <h3 className="mt-6 font-serif text-2xl">
                  Your cart is waiting
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#858980]">
                  Find a book that catches your eye and add it to your
                  collection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById("books")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-6 rounded-full bg-[#244a38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315c46]"
                >
                  Explore books
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => {
                  const book = getItemBook(item, books);
                  const lineTotal =
                    Number(book.price || 0) * Number(item.quantity || 1);

                  return (
                    <article
                      key={`${item.book_id}-${item.id ?? index}`}
                      className="flex gap-4 rounded-2xl border border-[#e8e5db] bg-white p-4"
                    >
                      {book.cover_image ? (
                        <img
                          src={book.cover_image}
                          alt={`Cover of ${book.title}`}
                          className="h-28 w-[76px] shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-[76px] shrink-0 items-center justify-center rounded-lg border border-[#dce1d4] bg-[#e9ecdf] p-2 text-center">
                          <span className="font-serif text-xs leading-4 text-[#45604a]">
                            {book.title}
                          </span>
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="line-clamp-2 font-serif text-base leading-snug text-[#202c25]">
                          {book.title}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs text-[#858980]">
                          by {book.author}
                        </p>
                        <p className="mt-2 text-xs text-[#858980]">
                          Quantity: {item.quantity}
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                          <span className="text-sm font-semibold text-[#244a38]">
                            {formatPrice(lineTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveFromCart(item.book_id)
                            }
                            disabled={removingBookId === item.book_id}
                            className="text-xs font-medium text-[#9a6259] underline underline-offset-4 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {removingBookId === item.book_id ? (
                              <span className="inline-flex items-center gap-1">
                                <LoaderCircle className="h-3 w-3 animate-spin" />
                                Removing...
                              </span>
                            ) : (
                              "Remove"
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#e8e5db] bg-[#f7f5ef] px-5 py-5 sm:px-7">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#7c8178]">Subtotal</span>
              <span className="font-serif text-2xl font-semibold text-[#244a38]">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-[#858980]">
              Your final order total is calculated and validated by the server.
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={
                cart.length === 0 || loadingCart || creatingOrder
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#244a38] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#315c46] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingOrder ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Preparing your order...
                </>
              ) : (
                <>
                  Continue to payment
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="mt-3 w-full rounded-full border border-[#dddcd1] px-5 py-3 text-sm font-medium text-[#244a38] transition hover:bg-white"
            >
              Continue browsing
            </button>

            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 px-5 py-2 text-xs font-medium text-[#687267] transition hover:text-[#244a38]"
            >
              <Package className="h-4 w-4" />
              View order history
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </aside>
      </main>
    </AuthGuard>
  );
}