"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  passwordFormSchema,
  type PasswordFormInput,
} from "@/features/profile/schemas";
import { authClient } from "@/lib/auth-client";
import { createZodResolver } from "@/lib/zod-form";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";

export function PasswordForm() {
  const form = useForm<PasswordFormInput>({
    resolver: createZodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
  });

  async function handleSubmit(values: PasswordFormInput) {
    let result;

    try {
      result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions ?? true,
      });
    } catch (error) {
      const message = error instanceof Error ? `: ${error.message}` : "";

      toast.error(`Không thể đổi mật khẩu${message}`);
      return;
    }

    if (result.error) {
      toast.error("Mật khẩu hiện tại không đúng hoặc không thể đổi mật khẩu.");
      return;
    }

    form.reset();
    toast.success("Đã đổi mật khẩu.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F1] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6B4F]">
            Độ tin cậy tài khoản
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Giữ đăng nhập an toàn
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Mật khẩu mạnh và thu hồi phiên cũ giúp dữ liệu tài chính cá nhân
            không bị truy cập từ thiết bị bạn không còn dùng.
          </p>
        </div>
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="current-password"
                  className={INPUT_CLASS}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nhập lại mật khẩu mới</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="new-password"
                  className={INPUT_CLASS}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="revokeOtherSessions"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 rounded-xl border border-[#E4DED3] bg-[#FFFDF7]/70 p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-label="Đăng xuất khỏi các thiết bị khác"
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel>Đăng xuất khỏi các thiết bị khác</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Giữ phiên hiện tại và thu hồi các phiên đăng nhập còn lại.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button
          id="changePassword"
          type="submit"
          className="h-11 bg-primary hover:bg-primary-hover"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </Form>
  );
}
