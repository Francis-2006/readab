"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";

type SignupForm = {
    username: string;
    email: string;
    password: string;
};

const INITIAL_FORM: SignupForm = {
    username: "",
    email: "",
    password: "",
};

const INPUT_CLASS =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export default function SignupPage() {
    const [form, setForm] = useState<SignupForm>(INITIAL_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter()

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
        setSuccess("");
    }

    function validateForm(): string | null {
        if (form.username.trim().length < 3) {
            return "Username must be at least 3 characters long.";
        }

        if (form.username.trim().length > 30) {
            return "Username cannot exceed 30 characters.";
        }

        const email = form.email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return "Please enter a valid email address.";
        }

        if (form.password.length < 8) {
            return "Password must be at least 8 characters long.";
        }

        return null;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    username: form.username.trim(),
                    email: form.email.trim(),
                }),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message || "Unable to create your account."
                );
            }

            setSuccess(data?.message || "Account created successfully!");
            setTimeout(() => (
                router.push("/auth/login")
            ),3000)
            setForm({ ...INITIAL_FORM });
            setShowPassword(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
            setTimeout(() => {
                setError("")
            }, 3000);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-10">
            <div className="w-full max-w-md">
                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 sm:p-8">
                    <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-gray-900">
                        Create your account
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <FormField
                            id="username"
                            label="Username"
                            name="username"
                            type="text"
                            placeholder="johndoe"
                            value={form.username}
                            onChange={handleChange}
                            autoComplete="username"
                            minLength={3}
                            maxLength={30}
                            required
                        />

                        <FormField
                            id="email"
                            label="Email address"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="email"
                            required
                        />

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>

                                <span className="text-xs text-gray-400">
                                    At least 8 characters
                                </span>
                            </div>

                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    className={`${INPUT_CLASS} pr-20`}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((previous) => !previous)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <FeedbackMessage
                            type="error"
                            message={error}
                        />

                        <FeedbackMessage
                            type="success"
                            message={success}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center cursor-pointer justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Creating account..."
                                : "Create account"}
                        </button>

                        <p className="pt-1 text-center text-sm text-gray-500">
                            Already have an account?{" "}
                            <a
                                href="/auth/login"
                                className="font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                Sign in
                            </a>
                        </p>
                    </form>
                </section>
            </div>
        </main>
    );
}

type FormFieldProps = {
    id: string;
    label: string;
    name: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    autoComplete: string;
    minLength?: number;
    maxLength?: number;
    required?: boolean;
};

function FormField({
    id,
    label,
    name,
    type,
    placeholder,
    value,
    onChange,
    autoComplete,
    minLength,
    maxLength,
    required = false,
}: FormFieldProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-medium text-gray-700"
            >
                {label}
            </label>

            <input
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                minLength={minLength}
                maxLength={maxLength}
                required={required}
                className={INPUT_CLASS}
            />
        </div>
    );
}

type FeedbackMessageProps = {
    type: "error" | "success";
    message: string;
};

function FeedbackMessage({ type, message }: FeedbackMessageProps) {
    if (!message) return null;

    const styles =
        type === "error"
            ? "border-red-100 bg-red-50 text-red-600"
            : "border-green-100 bg-green-50 text-green-700";

    return (
        <div
            role={type === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
        >
            {message}
        </div>
    );
}