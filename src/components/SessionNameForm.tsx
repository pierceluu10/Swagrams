"use client";

// Swagrams — temporary display name form

import { useState } from "react";
import { SlabButton } from "@/components/ui/SlabButton";

const FIELD_LABEL = "block w-full text-left font-label text-xs uppercase tracking-wider text-on-surface-variant";

const INPUT_FIELD =
  "w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 font-headline text-on-surface placeholder:text-on-surface-variant/50";

type Props = {
  onSubmit: (name: string) => void;
  buttonLabel: string;
  /** Override default id when multiple forms exist on one page */
  inputId?: string;
};

const MIN_LEN = 2;

export function SessionNameForm({ onSubmit, buttonLabel, inputId = "session-display-name" }: Props) {
  const [name, setName] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const hintId = `${inputId}-hint`;

  return (
    <form
      className="flex w-full flex-col gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const clean = name.trim();
        if (clean.length < MIN_LEN) {
          setValidationMessage(`At least ${MIN_LEN} characters.`);
          return;
        }
        setValidationMessage("");
        onSubmit(clean);
      }}
    >
      <label className={FIELD_LABEL} htmlFor={inputId}>
        Display name
      </label>
      <input
        id={inputId}
        className={INPUT_FIELD}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (validationMessage && e.target.value.trim().length >= MIN_LEN) setValidationMessage("");
        }}
        placeholder="Type your name"
        minLength={MIN_LEN}
        maxLength={18}
        required
        autoComplete="nickname"
        aria-invalid={validationMessage ? true : undefined}
        aria-describedby={validationMessage ? hintId : undefined}
      />
      <p className="font-body text-xs text-on-surface-variant/80">Minimum {MIN_LEN} characters.</p>
      {validationMessage ? (
        <p id={hintId} className="font-body text-sm text-error" role="alert">
          {validationMessage}
        </p>
      ) : null}
      <SlabButton variant="tan" size="compact" type="submit">
        <span>{buttonLabel}</span>
      </SlabButton>
    </form>
  );
}
