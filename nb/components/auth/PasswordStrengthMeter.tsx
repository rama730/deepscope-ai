"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export default function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "", percentage: 0 };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      noCommon: !isCommonPassword(password),
    };

    if (checks.length) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.number) score += 1;
    if (checks.special) score += 1;
    if (checks.noCommon) score += 1;

    let label = "";
    let colorClass = "";
    let percentage = 0;

    if (score <= 2) {
      label = "Weak";
      colorClass = "bg-red-500 text-red-500";
      percentage = 33;
    } else if (score <= 4) {
      label = "Medium";
      colorClass = "bg-amber-500 text-amber-500";
      percentage = 66;
    } else {
      label = "Strong";
      colorClass = "bg-emerald-500 text-emerald-500";
      percentage = 100;
    }

    const [bgColor, textColor] = colorClass.split(" ");

    return { score, label, bgColor, textColor, percentage, checks };
  }, [password]);

  function isCommonPassword(pwd: string): boolean {
    const common = [
      "password", "123456", "12345678", "qwerty", "abc123", "password1",
      "admin", "letmein", "welcome", "monkey", "sunshine"
      // ... list truncated for brevity in implementation, can be expanded back if needed
    ];
    const lowerPwd = pwd.toLowerCase();
    return common.some(c => lowerPwd === c || lowerPwd.includes(c));
  }

  if (!password && !showRequirements) return null;

  return (
    <div className="mt-2 text-xs">
      {password && (
        <div className="mb-2">
          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full transition-all duration-300 rounded-full ${strength.bgColor}`}
              style={{ width: `${strength.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${strength.textColor}`}>
              {strength.label}
            </span>
            {strength.score > 0 && (
              <span className="text-zinc-500 dark:text-zinc-400">{strength.score}/6</span>
            )}
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="flex flex-col gap-1 mt-2">
          <Requirement met={strength.checks?.length} label="At least 8 characters" />
          <Requirement met={strength.checks?.uppercase} label="One uppercase letter" />
          <Requirement met={strength.checks?.lowercase} label="One lowercase letter" />
          <Requirement met={strength.checks?.number} label="One number" />
          <Requirement met={strength.checks?.special} label="One special character" />
          {password && strength.checks?.noCommon === false && (
            <div className="flex items-center gap-1.5 text-amber-500">
              <AlertCircle size={14} className="shrink-0" />
              <span>Avoid common passwords</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Requirement({ met, label }: { met?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 transition-colors ${met ? "text-emerald-500" : "text-zinc-500 dark:text-zinc-400"}`}>
      {met ? (
        <CheckCircle2 size={14} className="shrink-0" />
      ) : (
        <XCircle size={14} className="shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );
}
