import { list } from "@keystone-6/core"
import { allowAll } from "@keystone-6/core/access"
import {
  text,
  relationship,
  integer,
  checkbox,
  timestamp,
  select,
  json
} from "@keystone-6/core/fields"

export const Agent = list({
  access: allowAll,
  fields: {
    name: text({ validation: { isRequired: true } }),
    description: text(),
    type: select({
      options: [
        { label: "ComfyUI", value: "comfyui" },
        { label: "FastMCP", value: "fastmcp" },
        { label: "Custom", value: "custom" }
      ],
      defaultValue: "comfyui"
    }),
    config: json(),
    isEnabled: checkbox({ defaultValue: true }),
    lastHeartbeat: timestamp(),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
    updatedAt: timestamp({ defaultValue: { kind: "now" } })
  }
})
