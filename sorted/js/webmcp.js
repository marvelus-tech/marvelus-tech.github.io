/* SORTED WebMCP — tool registration on document.modelContext */
(function (global) {
  "use strict";

  function jsonResult(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function wrap(fn) {
    return async function execute(args, _meta) {
      const result = fn(args || {});
      return jsonResult(result);
    };
  }

  function chipMode() {
    // Polyfill sets window.__webmcp_registered_tools; native Chrome does not.
    if (typeof global.__webmcp_registered_tools !== "undefined") return "polyfill";
    if (document.modelContext && typeof document.modelContext.registerTool === "function") return "live";
    return "fallback";
  }

  function setChip(mode) {
    mode = mode || chipMode();
    const chip = document.getElementById("mcp-chip");
    if (!chip) return;

    if (mode === "live") {
      chip.textContent = "WebMCP live";
      chip.setAttribute("data-state", "live");
    } else if (mode === "polyfill") {
      chip.textContent = "WebMCP polyfill";
      chip.setAttribute("data-state", "polyfill");
    } else {
      chip.textContent = "Demo mode";
      chip.setAttribute("data-state", "fallback");
    }
  }

  async function register() {
    const ctx = document.modelContext;
    if (!ctx || typeof ctx.registerTool !== "function") {
      setChip("fallback");
      return;
    }

    const tools = global.SortedTools;
    const defs = [
      {
        name: "what_is_sorted",
        description: "Learn what SORTED is, how it works, and how to join. This is an agent-first pet food management system.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.what_is_sorted(); })
      },
      {
        name: "join",
        description: "Sign up a household (pet + owner) for SORTED. After calling, read tell_your_human and say that sentence to the owner.",
        inputSchema: {
          type: "object",
          properties: {
            owner_name: { type: "string", description: "Owner's full name" },
            owner_email: { type: "string", description: "Owner's email address" },
            pet_name: { type: "string", description: "Pet's name" },
            species: { type: "string", enum: ["dog", "cat", "other"], description: "Pet species: dog, cat, or other" },
            food_brand: { type: "string", description: "Optional: current food brand" }
          },
          required: ["owner_name", "owner_email", "pet_name", "species"]
        },
        execute: wrap(function (args) { return tools.join(args); })
      },
      {
        name: "get_household",
        description: "Check if the household is registered and get current status.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.get_household(); })
      },
      {
        name: "preview_reorder",
        description: "Show a demo of low-stock alert and best-price comparison for the pet's food. After calling, read tell_your_human and share it with the owner.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.preview_reorder(); })
      },
      {
        name: "share_with_owner",
        description: "Send a message to the pet owner about SORTED status or actions. Always include tell_your_human in your response to the owner.",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string", description: "Message to share with the owner" }
          }
        },
        execute: wrap(function (args) { return tools.share_with_owner(args); })
      }
    ];

    try {
      for (let i = 0; i < defs.length; i++) {
        await ctx.registerTool(defs[i]);
      }
      setChip(chipMode());
    } catch (err) {
      console.error("Tool registration error:", err);
      setChip(chipMode());
    }
  }

  function start() {
    register();
  }

  if (global.SortedReady && typeof global.SortedReady.then === "function") {
    global.SortedReady.then(start);
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})(window);
