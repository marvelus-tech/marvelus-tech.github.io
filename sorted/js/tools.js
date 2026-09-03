/* SORTED Tools — localStorage-based demo implementation */
(function (global) {
  "use strict";

  const STORAGE_KEY = "sorted_household";

  function getHousehold() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  function saveHousehold(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  function generateId() {
    return "hh_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }

  const SortedTools = {
    what_is_sorted: function () {
      return {
        product: "SORTED",
        tagline: "Your pet's life, sorted.",
        description: "SORTED is an agent-first pet food management system. Your AI agent discovers this page, joins your household (pet + owner), and tells you when supplies are running low.",
        how_to_join: "Call the join tool with owner_name, owner_email, pet_name, species (dog|cat|other), and optional food_brand.",
        tell_your_human: "I found SORTED — it helps me track your pet's food and tell you when to reorder."
      };
    },

    join: function (args) {
      const { owner_name, owner_email, pet_name, species, food_brand } = args || {};

      if (!owner_name || !owner_email || !pet_name || !species) {
        return {
          error: "Missing required fields: owner_name, owner_email, pet_name, species"
        };
      }

      if (!["dog", "cat", "other"].includes(species)) {
        return {
          error: "species must be dog, cat, or other"
        };
      }

      const household = {
        id: generateId(),
        owner: {
          name: owner_name,
          email: owner_email
        },
        pet: {
          name: pet_name,
          species: species,
          food_brand: food_brand || "unspecified"
        },
        joined_at: new Date().toISOString(),
        status: "active"
      };

      saveHousehold(household);

      // Emit UI event
      if (global.SortedUI && global.SortedUI.onJoin) {
        global.SortedUI.onJoin(household);
      }

      return {
        success: true,
        household_id: household.id,
        message: `${pet_name} (${species}) and ${owner_name} joined SORTED`,
        tell_your_human: `Good news! I just signed up ${pet_name} for SORTED. I'll let you know when ${pet_name}'s ${species === "dog" ? "kibble" : "food"} is running low.`
      };
    },

    get_household: function () {
      const household = getHousehold();

      if (!household) {
        return {
          joined: false,
          message: "No household found. Call join first.",
          tell_your_human: "You haven't joined SORTED yet. Want me to sign you up?"
        };
      }

      return {
        joined: true,
        household_id: household.id,
        owner: household.owner,
        pet: household.pet,
        joined_at: household.joined_at,
        status: household.status,
        tell_your_human: `${household.pet.name} is registered on SORTED. Everything is sorted!`
      };
    },

    preview_reorder: function () {
      const household = getHousehold();

      if (!household) {
        return {
          error: "No household found. Call join first.",
          tell_your_human: "You need to join SORTED first before I can preview orders."
        };
      }

      const pet = household.pet;
      const brand = pet.food_brand !== "unspecified" ? pet.food_brand : "premium " + pet.species + " food";

      // Mock reorder preview
      const preview = {
        pet_name: pet.name,
        product: brand,
        status: "running_low",
        days_remaining: Math.floor(Math.random() * 5) + 2,
        best_price: {
          vendor: "Chewy",
          price_aud: (Math.random() * 20 + 35).toFixed(2),
          shipping: "free",
          arrival: "2-3 days"
        },
        alternative: {
          vendor: "Amazon",
          price_aud: (Math.random() * 20 + 40).toFixed(2),
          shipping: "Prime included",
          arrival: "1-2 days"
        },
        tell_your_human: `${pet.name}'s ${brand} is running low (about ${Math.floor(Math.random() * 5) + 2} days left). I found it for $${(Math.random() * 20 + 35).toFixed(2)} on Chewy with free shipping. Want me to place the order?`
      };

      // Emit UI event
      if (global.SortedUI && global.SortedUI.onPreview) {
        global.SortedUI.onPreview(preview);
      }

      return preview;
    },

    share_with_owner: function (args) {
      const { message } = args || {};
      const household = getHousehold();

      const response = {
        shared: true,
        message: message || "Your agent wants to share something with you about SORTED",
        tell_your_human: message || "Just checking in — everything with SORTED is running smoothly!"
      };

      if (household) {
        response.household_id = household.id;
        response.pet_name = household.pet.name;
      }

      return response;
    }
  };

  global.SortedTools = SortedTools;
})(window);
