// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";

afterEach(cleanup);

describe("InlineTextField", () => {
  it("saves immediately on Enter, without waiting out the debounce", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Cena" value="" onCommit={onCommit} />);

    await user.type(screen.getByLabelText("Cena"), "555{Enter}");

    expect(onCommit).toHaveBeenCalledWith("555");
  });

  it("saves on blur", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <>
        <InlineTextField label="Cena" value="" onCommit={onCommit} />
        <button>inde</button>
      </>
    );

    await user.type(screen.getByLabelText("Cena"), "42");
    await user.click(screen.getByRole("button", { name: "inde" }));

    expect(onCommit).toHaveBeenCalledWith("42");
  });

  it("flushes a pending edit when the field unmounts mid-debounce", async () => {
    // Collapsing a card or moving to the next step removes the input before the debounce fires;
    // without the unmount flush the last thing typed is silently dropped.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { unmount } = render(<InlineTextField label="Cena" value="" onCommit={onCommit} />);

    await user.type(screen.getByLabelText("Cena"), "888");
    expect(onCommit).not.toHaveBeenCalled(); // still inside the debounce window
    unmount();

    expect(onCommit).toHaveBeenCalledWith("888");
  });

  it("does not overwrite what is being typed when a save lands mid-word", async () => {
    // The reported "it doesn't save": a commit resolves while the technician is still typing,
    // the prop comes back with the older value, and the box snaps back — losing the new digits.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<InlineTextField label="Cena" value="" onCommit={onCommit} />);

    const input = screen.getByLabelText("Cena");
    await user.type(input, "12");
    rerender(<InlineTextField label="Cena" value="1" onCommit={onCommit} />);

    expect((input as HTMLInputElement).value).toBe("12");
  });

  it("does not put a 0 back in the box when the field is cleared to be retyped", async () => {
    // The reported "odhad nákladov sa resetuje počas vyplňovania": clearing a price commits
    // Number("") || 0, the prop comes back as "0", and the old code pushed that into the box
    // while the technician was still typing over it.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<InlineTextField label="Cena" value="98765" onCommit={onCommit} />);

    const input = screen.getByLabelText("Cena");
    await user.clear(input);
    rerender(<InlineTextField label="Cena" value="0" onCommit={onCommit} />);

    expect((input as HTMLInputElement).value).toBe("");
  });

  it("never sends an empty value for a required field", async () => {
    // The reported "opravy stien mi vymazáva": clearing a name to retype it committed "", the API
    // answered 400, and applyAndSave refetched the whole inspection — wiping the edit in progress.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Názov" value="Nová položka" onCommit={onCommit} required />);

    const input = screen.getByLabelText("Názov");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("saves a required field once it has content again", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Názov" value="Nová položka" onCommit={onCommit} required />);

    const input = screen.getByLabelText("Názov");
    await user.clear(input);
    await user.type(input, "Opravy stien{Enter}");

    expect(onCommit).toHaveBeenCalledWith("Opravy stien");
  });

  it("restores the previous value when a required field is left blank", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <>
        <InlineTextField label="Názov" value="Opravy stien" onCommit={onCommit} required />
        <button>inde</button>
      </>
    );

    const input = screen.getByLabelText("Názov");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "inde" }));

    expect((input as HTMLInputElement).value).toBe("Opravy stien");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not flush a blank required value on unmount", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { unmount } = render(<InlineTextField label="Názov" value="Opravy stien" onCommit={onCommit} required />);

    await user.clear(screen.getByLabelText("Názov"));
    unmount();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("still allows clearing a field that is not required", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Poznámka" value="text" onCommit={onCommit} />);

    await user.clear(screen.getByLabelText("Poznámka"));
    await user.keyboard("{Enter}");

    expect(onCommit).toHaveBeenCalledWith("");
  });

  it("keeps a typed decimal comma instead of discarding it", async () => {
    // type="number" silently drops anything it considers invalid, including the Slovak decimal
    // comma — the value arrived as "" and saved as 0. Numeric fields render as text now.
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Cena" value="0" type="number" onCommit={onCommit} />);

    const input = screen.getByLabelText("Cena") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.inputMode).toBe("decimal");

    await user.clear(input);
    await user.type(input, "45,50{Enter}");

    expect(onCommit).toHaveBeenCalledWith("45,50");
  });

  it("still picks up an external change when the field is not being edited", async () => {
    const onCommit = vi.fn();
    const { rerender } = render(<InlineTextField label="Cena" value="10" onCommit={onCommit} />);

    rerender(<InlineTextField label="Cena" value="99" onCommit={onCommit} />);

    expect((screen.getByLabelText("Cena") as HTMLInputElement).value).toBe("99");
  });

  it("does not re-commit a value that has not changed", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextField label="Cena" value="7" onCommit={onCommit} />);

    const input = screen.getByLabelText("Cena");
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("InlineTextAreaField", () => {
  it("keeps plain Enter as a newline rather than saving", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextAreaField label="Poznámka" value="" onCommit={onCommit} />);

    const area = screen.getByLabelText("Poznámka");
    await user.type(area, "prvý{Enter}druhý");

    expect((area as HTMLTextAreaElement).value).toBe("prvý\ndruhý");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("saves on Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<InlineTextAreaField label="Poznámka" value="" onCommit={onCommit} />);

    await user.type(screen.getByLabelText("Poznámka"), "hotovo");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onCommit).toHaveBeenCalledWith("hotovo");
  });

  it("flushes a pending edit on unmount", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { unmount } = render(<InlineTextAreaField label="Poznámka" value="" onCommit={onCommit} />);

    await user.type(screen.getByLabelText("Poznámka"), "rozpísané");
    unmount();

    expect(onCommit).toHaveBeenCalledWith("rozpísané");
  });
});
