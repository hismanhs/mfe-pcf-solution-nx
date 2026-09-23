import * as React from "react";

export interface WidgetProps {
  title?: string;
  sharedValue?: string;
  onSharedValueChange?: (value: string) => void;
  [key: string]: unknown;
}

const AUTH_STORAGE_KEY = "demo-auth-token";
const USER_STORAGE_KEY = "demo-auth-user";

async function loginApi(email: string, password: string): Promise<{ token: string; user: string }> {
  const response = await fetch("http://localhost:3000/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 

    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Login failed.");
  }

  return {
    token: result.token,
    user: result.user?.name || result.user?.email || "demo-user",
  };
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #d1d1d1",
  borderRadius: 8,
  padding: 20,
  fontFamily: "Segoe UI, sans-serif",
  borderLeft: "4px solid #0f6cbd",
  background: "#ffffff",
  maxWidth: 560,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #8a8886",
  borderRadius: 6,
  fontSize: 14,
  marginBottom: 12,
};

const App: React.FC<WidgetProps> = ({ title = "Client Auth Demo", sharedValue = "", onSharedValueChange }) => {
  const [email, setEmail] = React.useState("demo@contoso.com");
  const [password, setPassword] = React.useState("Pass@123");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [session, setSession] = React.useState<{ user: string; token: string } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const storedToken = window.localStorage.getItem(AUTH_STORAGE_KEY) || "";
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY) || "";

    if (storedToken) {
      return { user: storedUser || "demo-user", token: storedToken };
    }

    if (sharedValue) {
      return { user: "active-user", token: sharedValue };
    }

    return null;
  });

  React.useEffect(() => {
    if (sharedValue && (!session || session.token !== sharedValue)) {
      setSession({ user: session?.user || "active-user", token: sharedValue });
    }
  }, [session, sharedValue]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, session.token);
      window.localStorage.setItem(USER_STORAGE_KEY, session.user);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [session]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginApi(email, password);
      setSession({ user: result.user, token: result.token });
      onSharedValueChange?.(result.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    onSharedValueChange?.("");
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#605e5c" }}>
        Demo login flow. MFE 1 signs in and writes the token to the shared host state so MFE 2 can read it.
      </p>

      {!session ? (
        <form onSubmit={handleLogin}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={fieldStyle}
            placeholder="demo@contoso.com"
          />

          <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={fieldStyle}
            placeholder="Pass@123"
          />

          {error && (
            <div style={{ color: "#a80000", fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#0f6cbd",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      ) : (
        <div>
          <div
            style={{
              marginBottom: 12,
              border: "1px solid #d1d1d1",
              borderRadius: 6,
              padding: 12,
              background: "#f3f2f1",
            }}
          >
            <div style={{ fontSize: 12, color: "#605e5c" }}>Signed in as</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{session.user}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Access token</div>
            <div
              style={{
                background: "#f8f8f8",
                border: "1px solid #d1d1d1",
                borderRadius: 6,
                padding: 10,
                wordBreak: "break-all",
                fontFamily: "Consolas, monospace",
                fontSize: 12,
              }}
            >
              {session.token}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#5c5c5c",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
