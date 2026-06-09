"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/features/profile/actions";
import {
  profileFormSchema,
  type ProfileFormInput,
} from "@/features/profile/schemas";
import { createZodResolver } from "@/lib/zod-form";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-warm-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15";

type ProfileFormProps = {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const form = useForm<ProfileFormInput>({
    resolver: createZodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? "",
    },
  });

  async function handleSubmit(values: ProfileFormInput) {
    let result;

    try {
      result = await updateProfileAction(values);
    } catch (error) {
      const message = error instanceof Error ? `: ${error.message}` : "";

      toast.error(`Không thể cập nhật hồ sơ${message}`);
      return;
    }

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã cập nhật hồ sơ.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F1] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6B4F]">
            Hồ sơ hiển thị
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Cá nhân hóa cách MoneyMind gọi bạn
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            MoneyMind dùng thông tin này để hiển thị danh tính nhất quán trong
            ứng dụng, email vẫn là dữ liệu đăng nhập chỉ đọc.
          </p>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="name" className={INPUT_CLASS} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            name="email"
            value={user.email}
            readOnly
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </FormItem>
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className={INPUT_CLASS}
                  placeholder="https://example.com/avatar.png"
                  type="url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          id="saveProfile"
          type="submit"
          className="h-11 bg-primary hover:bg-primary-hover"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </form>
    </Form>
  );
}
