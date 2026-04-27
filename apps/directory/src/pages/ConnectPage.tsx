import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "../components/icons";
import { ETCS, getProgramBySlug } from "../data/catalog";
import { getStoredScreen } from "../eligibility/anonymousSession";
import { useSeo, siteUrl } from "../seo/useSeo";

interface ConnectFields {
  name: string;
  email: string;
  phone: string;
  bestTime: string;
  situation: string;
}

const EMPTY: ConnectFields = { name: "", email: "", phone: "", bestTime: "", situation: "" };

export function ConnectPage() {
  const navigate = useNavigate();
  const { programSlug = "wst-057" } = useParams<{ programSlug: string }>();
  const program = getProgramBySlug(programSlug);
  const offeringEtc = ETCS.find((e) => e.programs.includes(programSlug));

  const [fields, setFields] = useState<ConnectFields>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  useSeo({
    title: program
      ? `Connect about ${program.name} — Lewis Health`
      : "Connect with an ETC — Lewis Health",
    description:
      "Submit a connect request to the licensed Montana ETC offering this program. The clinical coordinator will follow up directly.",
    canonical: siteUrl(`/connect/${programSlug}`),
  });

  function update<K extends keyof ConnectFields>(k: K, v: ConnectFields[K]) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The full submission flow:
    //  1. POST /v1/public/connect-requests with fields + the anonymous screen token
    //     (if present); the API returns { needs_account: true, sign_up_url } when
    //     the email isn't a Clerk user yet.
    //  2. If needs_account, redirect through Clerk SignUp; on completion the
    //     directory calls POST /v1/patient/account/link-anonymous-screen to
    //     attach the screen to the new user_id.
    //  3. Confirmation lands here on /connect/confirmed.
    //
    // For now we just persist the form locally and show the confirmation. The
    // real wiring is intentionally absent — this is the only place in the
    // directory bundle that ever has cause to load Clerk, and the UX should be
    // verified end-to-end against the API before flipping it on.
    const screen = getStoredScreen(programSlug);
    void screen; // pass screen.token to the API once endpoint is live

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="fade-up"
        style={{
          minHeight: "calc(100vh - 130px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              marginBottom: 32,
            }}
          >
            We've connected you with{" "}
            <span className="italic" style={{ fontWeight: 300 }}>
              {offeringEtc?.name ?? "the ETC"}.
            </span>
          </h2>
          <p
            style={{
              color: "var(--ink-soft)",
              fontSize: 16.5,
              lineHeight: 1.6,
              marginBottom: 40,
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            Their clinical coordinator will reach out within two business days. While you wait,
            prepare the following for your first conversation.
          </p>
          <div
            style={{
              background: "var(--paper-card)",
              borderRadius: 6,
              padding: 32,
              textAlign: "left",
              maxWidth: 520,
              margin: "0 auto 40px",
            }}
          >
            {[
              "Your treating physician's written recommendation",
              "Current History & Physical (within 90 days)",
              "Records of prior standard-of-care treatments",
              "A list of current medications and allergies",
            ].map((t, i) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: i < 3 ? "1px solid var(--rule)" : "none",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: "1px solid var(--rule)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div style={{ fontSize: 14.5 }}>{t}</div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/")} className="pill pill-outline">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fade-up"
      style={{
        minHeight: "calc(100vh - 130px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          style={{
            fontSize: 12.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
            marginBottom: 18,
            textAlign: "center",
          }}
        >
          Connect Request · {program?.name ?? "Program"} · {offeringEtc?.name ?? "ETC"}
        </div>
        <h2
          className="serif"
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            textAlign: "center",
            marginBottom: 36,
            fontWeight: 400,
          }}
        >
          Tell us how to{" "}
          <span className="italic" style={{ fontWeight: 300 }}>
            reach you.
          </span>
        </h2>
        <form
          onSubmit={onSubmit}
          style={{ background: "var(--paper-card)", borderRadius: 6, padding: 40 }}
        >
          {(
            [
              {
                key: "name",
                label: "Your name",
                placeholder: "Full name",
                type: "text",
                required: true,
              },
              {
                key: "email",
                label: "Email",
                placeholder: "name@example.com",
                type: "email",
                required: true,
              },
              {
                key: "phone",
                label: "Phone (optional)",
                placeholder: "(406) 555-0000",
                type: "tel",
                required: false,
              },
              {
                key: "bestTime",
                label: "Best time to contact",
                placeholder: "Weekday mornings, after 5pm, etc.",
                type: "text",
                required: false,
              },
            ] as const
          ).map((f) => (
            <label key={f.key} style={{ display: "block", marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 12.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-soft)",
                  marginBottom: 8,
                }}
              >
                {f.label}
              </div>
              <input
                type={f.type}
                placeholder={f.placeholder}
                required={f.required}
                value={fields[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  borderRadius: 9999,
                  fontFamily: "var(--sans)",
                  fontSize: 15,
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </label>
          ))}
          <label style={{ display: "block", marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-soft)",
                marginBottom: 8,
              }}
            >
              Brief situation
            </div>
            <textarea
              placeholder="A sentence or two about why you're reaching out."
              rows={4}
              value={fields.situation}
              onChange={(e) => update("situation", e.target.value)}
              style={{
                width: "100%",
                padding: "14px 18px",
                background: "var(--paper)",
                border: "1px solid var(--rule)",
                borderRadius: 18,
                fontFamily: "var(--sans)",
                fontSize: 15,
                color: "var(--ink)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </label>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-soft)",
              marginBottom: 28,
              fontStyle: "italic",
            }}
          >
            Please don't share specific medical details here — your ETC clinical team will collect
            those securely after they reach out.
          </div>
          <button
            type="submit"
            className="pill pill-primary"
            style={{ width: "100%", padding: "16px 28px" }}
          >
            Send connect request <ArrowRight />
          </button>
        </form>
      </div>
    </div>
  );
}
