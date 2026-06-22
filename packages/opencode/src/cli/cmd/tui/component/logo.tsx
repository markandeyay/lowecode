import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { logo } from "@/cli/logo"

export function Logo() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()

  const center = (line: string) => {
    const width = dimensions().width
    if (width <= line.length) return line.trimEnd()
    return " ".repeat(Math.floor((width - line.length) / 2)) + line.trimEnd()
  }

  return (
    <box flexDirection="column" width={dimensions().width}>
      <For each={logo.lines}>
        {(line, index) => (
          <text
            fg={index() === 0 || index() === logo.lines.length - 1 ? theme.primary : theme.secondary}
            attributes={TextAttributes.BOLD}
            selectable={false}
          >
            {center(line)}
          </text>
        )}
      </For>
    </box>
  )
}
