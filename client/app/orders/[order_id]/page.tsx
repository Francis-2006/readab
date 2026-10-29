
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type OrderItem = {
  book_id: number;
  title: string;
  author?: string;
  cover_image?: string | null;
  price: number;
  quantity: number;
  line_total: number;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-GH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem("access_token");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const response = data as {
      detail?: string | { msg?: string }[];
      message?: string;
    };

    if (typeof response.detail === "string") {
      return response.detail;
    }

    if (Array.isArray(response.detail)) {
      return response.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ") || fallback;
    }

    if (response.message) {
      return response.message;
    }
  }

  return fallback;
}

function getStatus(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
    case "completed":
    case "successful":
      return {
        styles: "bg-green-100 text-green-800",
        icon: <CheckCircle2 size={17} />,
        description: "Your payment has been confirmed.",
      };

    case "failed":
    case "cancelled":
      return {
        styles: "bg-red-100 text-red-700",
        icon: <XCircle size={17} />,
        description:
          status.toLowerCase() === "failed"
            ? "The payment was unsuccessful."
            : "This order has been cancelled.",
      };

    default:
      return {
        styles: "bg-amber-100 text-amber-800",
        icon: <Clock3 size={17} />,
        description: "This order is awaiting payment confirmation.",
      };
  }
}

export default function OrderDetailsPage() {
  const params = useParams<{ order_id: string }>();
  const orderId = params.order_id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    if (!orderId || !/^\d+$/.test(orderId)) {
      setError("The order ID in the URL is invalid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      const response = await fetch(
        `${API_URL}/orders/${encodeURIComponent(orderId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          cache: "no-store",
        }
      );

      const responseText = await response.text();

      let data: unknown = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `The server returned an unexpected response (HTTP ${response.status}). Check that the backend endpoint is correct.`
        );
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${getErrorMessage(
            data,
            "Unable to load this order."
          )}`
        );
      }

      // Your API returns the order directly:
      // { id, total_amount, status, created_at, items: [...] }
      const result = data as Order;

      if (
        typeof result !== "object" ||
        result === null ||
        typeof result.id !== "number" ||
        typeof result.total_amount !== "number" ||
        !Array.isArray(result.items)
      ) {
        throw new Error(
          "The order response does not match the expected format. Check the JSON returned by your backend."
        );
      }

      setOrder(result);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          `Cannot connect to the backend at ${API_URL}. Make sure your FastAPI server is running and the backend URL is correct.`
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading this order."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const status = order ? getStatus(order.status) : null;

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#244a38]">
      <header className="border-b border-[#244a38]/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#244a38] text-[#f7f5ef]">
              <BookOpen size={23} />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Readab
            </span>
          </Link>

          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full border border-[#244a38]/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-[#244a38] hover:text-white"
          >
            <Package size={17} />
            My orders
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
        <Link
          href="/orders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#244a38]/65 hover:text-[#244a38]"
        >
          <ArrowLeft size={16} />
          Back to order history
        </Link>

        {loading && (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-[#244a38]/10 bg-white/70 p-8 text-center">
            <LoaderCircle
              size={36}
              className="animate-spin text-[#244a38]"
            />
            <p className="mt-4 font-semibold">
              Loading order details...
            </p>
            <p className="mt-1 text-sm text-[#244a38]/60">
              Please wait while we retrieve your order.
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={28} />
            </div>

            <h1 className="mt-4 text-2xl font-bold">
              Unable to load order
            </h1>

            <p className="mx-auto mt-3 max-w-xl whitespace-pre-wrap break-words text-sm leading-6 text-[#244a38]/70">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadOrder()}
                className="inline-flex items-center gap-2 rounded-full bg-[#244a38] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193728]"
              >
                <RefreshCw size={16} />
                Try again
              </button>

              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-full border border-[#244a38]/20 px-5 py-3 text-sm font-semibold hover:bg-[#244a38]/5"
              >
                Order history
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && order && status && (
          <>
            <section className="rounded-3xl bg-[#244a38] p-6 text-[#f7f5ef] sm:p-9">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-white/65">
                    Order details
                  </p>
                  <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                    Order #{order.id}
                  </h1>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                    <CalendarDays size={16} />
                    Placed on {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold capitalize ${status.styles}`}
                  >
                    {status.icon}
                    {order.status}
                  </span>
                  <p className="mt-3 text-sm text-white/70">
                    {status.description}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-[#244a38]/10 bg-white/80">
              <div className="border-b border-[#244a38]/10 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <ShoppingBag size={20} />
                  Items in this order
                </h2>
                <p className="mt-1 text-sm text-[#244a38]/60">
                  {order.items.reduce(
                    (total, item) => total + item.quantity,
                    0
                  )}{" "}
                  book(s) in this order
                </p>
              </div>

              {order.items.length > 0 ? (
                <div className="divide-y divide-[#244a38]/10 px-5 sm:px-6">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.book_id}-${index}`}
                      className="flex items-start justify-between gap-4 py-5"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#244a38]/10">
                          {item.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.cover_image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BookOpen size={27} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            {item.title}
                          </h3>
                          {item.author && (
                            <p className="mt-1 text-sm text-[#244a38]/65">
                              by {item.author}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-[#244a38]/50">
                            Book ID: {item.book_id}
                          </p>
                          <p className="mt-2 text-sm text-[#244a38]/65">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 font-bold">
                        {formatPrice(item.line_total)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-[#244a38]/60">
                  There are no items listed for this order.
                </p>
              )}

              <div className="border-t border-[#244a38]/10 bg-[#f7f5ef]/70 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Order total</p>
                    <p className="mt-1 text-sm text-[#244a38]/60">
                      Total amount for this order
                    </p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatPrice(order.total_amount)}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-[#244a38]/10 bg-white/80 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#244a38]/10">
                  {["paid", "completed", "successful"].includes(
                    order.status.toLowerCase()
                  ) ? (
                    <ShieldCheck size={22} />
                  ) : (
                    <CreditCard size={22} />
                  )}
                </div>
                <div>
                  <h2 className="font-bold">Payment information</h2>
                  <p className="mt-1 text-sm leading-6 text-[#244a38]/65">
                    {status.description} Check your order history for
                    updates to the payment status.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244a38] px-6 py-3 font-semibold text-white hover:bg-[#193728]"
              >
                <ArrowLeft size={17} />
                All orders
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#244a38]/20 px-6 py-3 font-semibold hover:bg-[#244a38]/5"
              >
                <BookOpen size={17} />
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}