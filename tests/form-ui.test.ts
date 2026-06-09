import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  useForm,
  type ControllerProps,
  type UseFormReturn,
} from "react-hook-form";

import {
  EmptyState,
  InsightCard,
  MetricCard,
  SectionCard,
} from "@/components/app-ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type ExampleFormValues = {
  name: string;
};

const ExampleFormProvider = Form as React.ComponentType<
  React.PropsWithChildren<UseFormReturn<ExampleFormValues>>
>;
const ExampleFormField = FormField as React.ComponentType<
  ControllerProps<ExampleFormValues, "name">
>;

function ExampleForm() {
  const form = useForm<ExampleFormValues>({
    defaultValues: {
      name: "",
    },
    mode: "onSubmit",
  });

  return React.createElement(
    ExampleFormProvider,
    { ...form },
    React.createElement(
      "form",
      {
        noValidate: true,
        onSubmit: form.handleSubmit(() => undefined),
      },
      React.createElement(ExampleFormField, {
        control: form.control,
        name: "name",
        rules: { required: "Tên là bắt buộc." },
        render: ({ field }) =>
          React.createElement(
            FormItem,
            null,
            React.createElement(FormLabel, null, "Tên"),
            React.createElement(
              FormControl,
              null,
              React.createElement(Input, field),
            ),
            React.createElement(FormMessage),
          ),
      }),
      React.createElement("button", { type: "submit" }, "Lưu"),
    ),
  );
}

describe("shadcn React Hook Form primitives", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("links labels, controls, and validation messages", async () => {
    await act(async () => {
      root.render(React.createElement(ExampleForm));
    });

    const input = container.querySelector("input");
    const label = container.querySelector("label");
    expect(input?.id).toBeTruthy();
    expect(label?.htmlFor).toBe(input?.id);

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(container.textContent).toContain("Tên là bắt buộc.");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.getAttribute("aria-describedby")).toContain(
      "form-item-message",
    );
    expect(container.querySelector("[role='alert']")?.textContent).toContain(
      "Tên là bắt buộc.",
    );
  });
});

describe("MoneyMind app-level UI wrappers", () => {
  it("render outside the generated ui primitive boundary", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(
          "div",
          null,
          React.createElement(SectionCard, null, "Nội dung"),
          React.createElement(MetricCard, {
            label: "Chi tiêu",
            value: "100.000 ₫",
            helper: "Trong tháng này",
          }),
          React.createElement(InsightCard, {
            title: "Gợi ý",
            description: "Theo dõi chi tiêu đều đặn.",
          }),
          React.createElement(EmptyState, {
            title: "Chưa có dữ liệu",
            description: "Thêm giao dịch đầu tiên.",
          }),
        ),
      );
    });

    expect(container.textContent).toContain("Nội dung");
    expect(container.textContent).toContain("Chi tiêu");
    expect(container.textContent).toContain("Gợi ý");
    expect(container.textContent).toContain("Chưa có dữ liệu");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
