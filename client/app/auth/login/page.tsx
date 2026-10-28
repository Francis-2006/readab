"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginForm = {
    identifier: string;
    password: string;
};

export default function LoginPage() {
    const [form, setForm] = useState<LoginForm>({
        identifier: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter()

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
        setSuccess("");
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.identifier.trim()) {
            setError("Please enter your email or username.");
            return;
        }

        if (!form.password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/signin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || data.message || "Unable to sign in."
                );
            }

            // Save the JWT token in localStorage
            if (!data.access_token) {
                throw new Error("Login response did not contain an access token.");
            }

            localStorage.setItem("access_token", data.access_token);

            setSuccess(data.message || "Login successful!");
            setTimeout(() => {
                router.push("/")
            }, 2500);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
            setTimeout(() => {
                setError("")
            }, 2500);
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-10">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 sm:p-8">
                    <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-gray-900">
                        Welcome back
                    </h1>

                    <p className="mb-8 text-center text-sm text-gray-500">
                        Sign in to your account to continue.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email or Username */}
                        <div>
                            <label
                                htmlFor="identifier"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Email or Username
                            </label>

                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                autoComplete="username"
                                placeholder="user@gmail.com or username"
                                value={form.identifier}
                                onChange={handleChange}
                                required
                                className={inputClass}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>

                                <a
                                    href="/auth/forgot-password"
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    Forgot password?
                                </a>
                            </div>

                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="**********"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    className={`${inputClass} pr-20`}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                            >
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div
                                role="status"
                                className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
                            >
                                {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        {/* Signup Link */}
                        <p className="pt-2 text-center text-sm text-gray-500">
                            Don't have an account?{" "}
                            <a
                                href="/auth/signup"
                                className="font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                Create account
                            </a>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}