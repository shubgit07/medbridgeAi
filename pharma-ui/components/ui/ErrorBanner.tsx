"use client";

import React, { useState } from "react";

type ErrorBannerProps = {
  message: string;
  onDismiss?: () => void;
};

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="flex w-full items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-red-700 hover:text-red-900"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
