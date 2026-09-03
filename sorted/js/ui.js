/* SORTED UI — page interactions and demo controls */
(function (global) {
  "use strict";

  const SortedUI = {
    onJoin: function (household) {
      console.log("Household joined:", household);
      
      // Update status card if visible
      const statusCard = document.getElementById("status-card");
      if (statusCard) {
        statusCard.innerHTML = `
          <div class="status-card-content">
            <div class="status-icon">✓</div>
            <h3>Joined!</h3>
            <p><strong>${household.pet.name}</strong> (${household.species}) and <strong>${household.owner.name}</strong></p>
            <p class="status-detail">Your agent just signed you up. It will tell you when supplies run low.</p>
          </div>
        `;
        statusCard.style.display = "block";
      }
    },

    onPreview: function (preview) {
      console.log("Preview generated:", preview);
      
      const statusCard = document.getElementById("status-card");
      if (statusCard) {
        statusCard.innerHTML = `
          <div class="status-card-content">
            <div class="status-icon">📦</div>
            <h3>${preview.pet_name}'s food is running low</h3>
            <p class="status-detail">${preview.days_remaining} days remaining</p>
            <div class="price-comparison">
              <div class="price-option best">
                <div class="vendor">${preview.best_price.vendor}</div>
                <div class="price">$${preview.best_price.price_aud}</div>
                <div class="shipping">${preview.best_price.shipping} • ${preview.best_price.arrival}</div>
              </div>
              <div class="price-option">
                <div class="vendor">${preview.alternative.vendor}</div>
                <div class="price">$${preview.alternative.price_aud}</div>
                <div class="shipping">${preview.alternative.shipping} • ${preview.alternative.arrival}</div>
              </div>
            </div>
          </div>
        `;
        statusCard.style.display = "block";
      }
    },

    copyPrompt: function () {
      const prompt = `Visit https://marvelus-tech.github.io/sorted/ and help me join SORTED.

Call what_is_sorted to learn about it, then call join with my details:
- owner_name: [your name]
- owner_email: [your email]
- pet_name: [pet name]
- species: [dog/cat/other]
- food_brand: [optional brand]

After joining, tell me what you did by reading the tell_your_human field from the response.`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(function () {
          const btn = document.getElementById("copy-prompt-btn");
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(function () {
              btn.textContent = originalText;
            }, 2000);
          }
        }).catch(function (err) {
          console.error("Copy failed:", err);
          alert("Copy failed. Please copy manually.");
        });
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = prompt;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          const btn = document.getElementById("copy-prompt-btn");
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(function () {
              btn.textContent = originalText;
            }, 2000);
          }
        } catch (err) {
          console.error("Copy failed:", err);
          alert("Copy failed. Please copy manually.");
        }
        document.body.removeChild(textarea);
      }
    },

    resetDemo: function () {
      if (confirm("Reset demo? This will clear your household data.")) {
        localStorage.removeItem("sorted_household");
        const statusCard = document.getElementById("status-card");
        if (statusCard) {
          statusCard.style.display = "none";
        }
        location.reload();
      }
    },

    init: function () {
      // Bind copy button
      const copyBtn = document.getElementById("copy-prompt-btn");
      if (copyBtn) {
        copyBtn.addEventListener("click", this.copyPrompt);
      }

      // Bind reset button
      const resetBtn = document.getElementById("reset-demo-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", this.resetDemo);
      }

      // Check if already joined
      const household = global.SortedTools.get_household();
      if (household && household.joined) {
        this.onJoin({
          pet: household.pet,
          owner: household.owner,
          species: household.pet.species
        });
      }
    }
  };

  global.SortedUI = SortedUI;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      SortedUI.init();
    });
  } else {
    SortedUI.init();
  }
})(window);
