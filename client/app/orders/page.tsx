
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  LoaderCircle,
  Package,
  ShoppingBag,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type OrderItem = {
  book_id: number;
  title: string;
  price: number;
  quantity: number;
  line_total: number;
};

type Order = {
  id?: number;
  order_id?: number;
  status: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
};

type OrdersResponse = {
  orders: Order[];
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

  return parsedDate.toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
    case "completed":
    case "successful":
      return {
        className: "bg-green-100 text-green-800",
        icon: <CheckCircle2 size={15} />,
        label: status,
      };

    case "failed":
    case "cancelled":
      return {
        className: "bg-red-100 text-red-700",
        icon: <XCircle size={15} />,
        label: status,
      };

    case "pending":
    default:
      return {
        className: "bg-amber-100 text-amber-800",
        icon: <Clock3 size={15} />,
        label: status || "Pending",
      };
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("access_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null) {
    const response = data as {
      detail?: string | { msg?: string }[];
      message?: string;
    };

    if (typeof response.detail === "string") {
      return response.detail;
    }

    if (Array.isArray(response.detail) && response.detail.length > 0) {
      return response.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
    }

    if (response.message) {
      return response.message;
    }
  }

  return fallback;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load your orders.")
        );
      }

      const result = data as OrdersResponse;
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#244a38]">
      {/* Header */}
      <header className="border-b border-[#244a38]/10 bg-[#f7f5ef]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#244a38] text-[#f7f5ef]">
              <BookOpen size={23} />
            </div>

            <span className="text-2xl font-bold tracking-tight">
              Readab
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#244a38]/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-[#244a38] hover:text-white"
          >
            <ShoppingBag size={17} />
            Browse books
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Page heading */}
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#244a38]/65 transition hover:text-[#244a38]"
            >
              <ArrowLeft size={16} />
              Back to bookstore
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#244a38]/10">
                <History size={25} />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  My orders
                </h1>
                <p className="mt-1 text-sm text-[#244a38]/65">
                  View your purchases and order status.
                </p>
              </div>
            </div>
          </div>

          {!loading && !error && (
            <div className="rounded-2xl border border-[#244a38]/10 bg-white/70 px-5 py-3">
              <p className="text-sm text-[#244a38]/60">
                Total orders
              </p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-[#244a38]/10 bg-white/70 p-8 text-center">
            <LoaderCircle
              size={34}
              className="animate-spin text-[#244a38]"
            />
            <p className="mt-4 font-semibold">Loading your orders...</p>
            <p className="mt-1 text-sm text-[#244a38]/60">
              Just a moment.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={28} />
            </div>

            <h2 className="mt-4 text-xl font-bold">
              We couldn&apos;t load your orders
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm text-[#244a38]/65">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#244a38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193728]"
            >
              Try again
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-3xl border border-[#244a38]/10 bg-white/70 px-6 py-16 text-center sm:px-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#244a38]/10">
              <Package size={38} strokeWidth={1.5} />
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#244a38]/65">
              Your orders will appear here after you check out. Find your
              next great read in the Readab bookstore.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#244a38] px-6 py-3 font-semibold text-white transition hover:bg-[#193728]"
            >
              Explore books
              <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-5">
            {orders.map((order, index) => {
              const orderId = order.order_id ?? order.id;
              const status = getStatusStyles(order.status);
              const items = order.items ?? [];

              return (
                <article
                  key={orderId ?? `order-${index}`}
                  className="overflow-hidden rounded-3xl border border-[#244a38]/10 bg-white/80 shadow-sm"
                >
                  <div className="flex flex-col gap-4 border-b border-[#244a38]/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#244a38]/50">
                        Order number
                      </p>

                      <h2 className="mt-1 text-xl font-bold">
                        {orderId !== undefined ? `#${orderId}` : "Order"}
                      </h2>

                      <p className="mt-2 flex items-center gap-2 text-sm text-[#244a38]/60">
                        <CalendarDays size={15} />
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${status.className}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>

                      {orderId !== undefined && (
                        <Link
                          href={`/orders/${orderId}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[#244a38]/20 px-4 py-2 text-sm font-semibold transition hover:bg-[#244a38] hover:text-white"
                        >
                          View order
                          <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-bold">
                        <BookOpen size={17} />
                        Order items
                      </h3>

                      <span className="text-sm text-[#244a38]/55">
                        {items.reduce(
                          (total, item) => total + item.quantity,
                          0
                        )}{" "}
                        book(s)
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item, itemIndex) => (
                          <div
                            key={`${item.book_id}-${itemIndex}`}
                            className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f5ef] p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {item.title}
                              </p>
                              <p className="mt-1 text-sm text-[#244a38]/60">
                                {formatPrice(item.price)} × {item.quantity}
                              </p>
                            </div>

                            <p className="shrink-0 font-bold">
                              {formatPrice(item.line_total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-[#f7f5ef] p-4 text-sm text-[#244a38]/60">
                        Item details are not available in this order summary.
                        Open the order to see more information.
                      </p>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-[#244a38]/10 pt-5">
                      <div className="flex items-center gap-2 text-sm text-[#244a38]/65">
                        <CreditCard size={17} />
                        Order total
                      </div>

                      <p className="text-xl font-bold">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && orders.length > 0 && (
          <p className="mt-8 text-center text-sm text-[#244a38]/55">
            Need help with an order? Contact the bookstore for assistance.
          </p>
        )}
      </div>
    </main>
  );
}