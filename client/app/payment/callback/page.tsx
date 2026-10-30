
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type PaymentResult = {
  status?: string;
  message?: string;
  reference?: string;
  order_id?: number | string;
  data?: {
    status?: string;
    message?: string;
    reference?: string;
    order_id?: number | string;
  };
};

type PageState = "loading" | "success" | "pending" | "failed" | "error";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("access_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
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

export default function PaymentCallbackPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [message, setMessage] = useState(
    "Please wait while we confirm your payment."
  );
  const [reference, setReference] = useState("");
  const [orderId, setOrderId] = useState<number | string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      const params = new URLSearchParams(window.location.search);

      // Paystack commonly returns reference and trxref.
      const paymentReference =
        params.get("reference") || params.get("trxref");

      if (!paymentReference) {
        setPageState("error");
        setMessage(
          "We could not find a payment reference in the return URL. Check your order history before trying to pay again."
        );
        return;
      }

      setReference(paymentReference);

      try {
        // This endpoint must verify the reference with Paystack on the backend.
        const response = await fetch(
          `${API_URL}/payments/verify/${encodeURIComponent(paymentReference)}`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
            cache: "no-store",
          }
        );

        const result = (await response.json().catch(() => ({}))) as PaymentResult;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              result,
              "We could not verify this payment. Please check your order history."
            )
          );
        }

        if (cancelled) return;

        const paymentStatus = (
          result.data?.status || result.status || ""
        ).toLowerCase();

        const returnedOrderId =
          result.data?.order_id ?? result.order_id ?? null;

        setOrderId(returnedOrderId);

        if (
          ["success", "successful", "paid", "completed"].includes(
            paymentStatus
          )
        ) {
          setPageState("success");
          setMessage(
            result.data?.message ||
              result.message ||
              "Your payment has been verified successfully."
          );
        } else if (
          ["pending", "processing", "ongoing", "queued"].includes(
            paymentStatus
          )
        ) {
          setPageState("pending");
          setMessage(
            result.data?.message ||
              result.message ||
              "Your payment is still being processed. Check your order history for updates."
          );
        } else {
          setPageState("failed");
          setMessage(
            result.data?.message ||
              result.message ||
              "The payment was not confirmed. Check your order status before trying again."
          );
        }
      } catch (err) {
        if (cancelled) return;

        setPageState("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Something went wrong while verifying your payment."
        );
      }
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, []);

  const retryVerification = () => {
    window.location.reload();
  };

  const isSuccess = pageState === "success";
  const isPending = pageState === "pending";
  const isFailed = pageState === "failed";
  const isError = pageState === "error";
  const isLoading = pageState === "loading";

  const heading = isSuccess
    ? "Payment successful!"
    : isPending
      ? "Payment processing"
      : isFailed
        ? "Payment not completed"
        : isError
          ? "Unable to verify payment"
          : "Confirming your payment";

  const Icon = isSuccess
    ? CheckCircle2
    : isPending || isLoading
      ? isLoading
        ? LoaderCircle
        : Clock3
      : XCircle;

  const iconColor = isSuccess
    ? "text-green-700 bg-green-100"
    : isPending || isLoading
      ? "text-amber-800 bg-amber-100"
      : "text-red-700 bg-red-100";

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f5ef] text-[#244a38]">
      {/* Header */}
      <header className="border-b border-[#244a38]/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
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
            <ShoppingBag size={17} />
            My orders
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-[#244a38]/10 bg-white/80 p-7 text-center shadow-sm sm:p-10">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconColor}`}
          >
            <Icon
              size={40}
              strokeWidth={1.7}
              className={isLoading ? "animate-spin" : ""}
            />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            {heading}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#244a38]/65">
            {message}
          </p>

          {reference && (
            <div className="mt-7 rounded-2xl bg-[#f7f5ef] p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#244a38]/50">
                Payment reference
              </p>
              <p className="mt-2 break-all font-mono text-sm">
                {reference}
              </p>

              {orderId !== null && (
                <div className="mt-4 border-t border-[#244a38]/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#244a38]/50">
                    Order number
                  </p>
                  <p className="mt-1 font-semibold">#{orderId}</p>
                </div>
              )}
            </div>
          )}

          {isSuccess && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-left text-sm leading-6 text-green-900">
              <ShieldCheck size={21} className="mt-0.5 shrink-0" />
              <p>
                Your payment has been verified. You can view your order
                details and status in your order history.
              </p>
            </div>
          )}

          {isPending && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
              <Clock3 size={21} className="mt-0.5 shrink-0" />
              <p>
                Avoid paying again while this transaction is being checked.
                Please revisit your order history for the latest status.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {(isSuccess || isPending || isFailed) && (
              <Link
                href={orderId !== null ? `/orders/${orderId}` : "/orders"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244a38] px-6 py-3 font-semibold text-white transition hover:bg-[#193728]"
              >
                View order
                <ArrowRight size={17} />
              </Link>
            )}

            {(isError || isFailed) && (
              <button
                type="button"
                onClick={retryVerification}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244a38] px-6 py-3 font-semibold text-white transition hover:bg-[#193728]"
              >
                <RefreshCw size={16} />
                Check again
              </button>
            )}

            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#244a38]/20 px-6 py-3 font-semibold transition hover:bg-[#244a38]/5"
            >
              <ShoppingBag size={17} />
              Order history
            </Link>
          </div>

          {isLoading && (
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#244a38]/50">
              <CreditCard size={14} />
              Please do not close this page while verification is in progress.
            </p>
          )}
        </section>
      </div>

      <footer className="px-5 py-5 text-center text-xs text-[#244a38]/45">
        Readab · Your next great read starts here.
      </footer>
    </main>
  );
}