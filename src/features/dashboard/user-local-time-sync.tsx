"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentMonthKey,
  USER_TIME_ZONE_COOKIE,
} from "@/features/dashboard/month";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthScopedPaths = new Set(["/dashboard", "/transactions"]);
const currentMonthScopedPaths = new Set([
  "/categories",
  ...monthScopedPaths,
]);

function getCookieValue(name: string) {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=31536000; SameSite=Lax`;
}

export function UserLocalTimeSync() {
  const router = useRouter();

  useEffect(() => {
    const pathname = window.location.pathname;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!timeZone || !currentMonthScopedPaths.has(pathname)) {
      return;
    }

    const previousTimeZone = getCookieValue(USER_TIME_ZONE_COOKIE);
    setCookie(USER_TIME_ZONE_COOKIE, timeZone);

    if (monthScopedPaths.has(pathname)) {
      const searchParams = new URLSearchParams(window.location.search);
      const month = searchParams.get("month");

      if (!month || !monthPattern.test(month)) {
        searchParams.set("month", getCurrentMonthKey(new Date(), timeZone));
        const query = searchParams.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`, {
          scroll: false,
        });
        return;
      }
    }

    if (previousTimeZone !== encodeURIComponent(timeZone)) {
      router.refresh();
    }
  }, [router]);

  return null;
}
