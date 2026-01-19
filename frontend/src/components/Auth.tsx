import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { LoginCredentials, RegisterCredentials } from "../lib/types";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(credentials as LoginCredentials);
      } else {
        await register(credentials as RegisterCredentials);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail || "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setCredentials({ username: "", password: "" });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10">
              <img src="/vite.svg" width={28} alt="ChatPDF Logo" />
            </div>
            <div className="text-4xl font-bold text-slate-900">ChatPDF</div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700">
            {isLogin ? "Welcome back!" : "Join ChatPDF"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isLogin
              ? "Sign in to continue chatting with your PDFs"
              : "Create an account to start chatting with PDFs"}
          </p>
        </div>{" "}
        <form
          className="mt-8 space-y-6 bg-white/90 p-8 rounded-2xl shadow-xl border border-slate-100 backdrop-blur"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="rounded-xl bg-rose-50 p-4 border border-rose-200">
              <div className="text-sm text-rose-700 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}{" "}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors sm:text-sm"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange}
              />
            </div>
          </div>{" "}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </div>
          <div className="text-center pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={toggleMode}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors duration-200 hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
