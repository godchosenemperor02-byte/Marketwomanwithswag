/* =====================================================
   MARKET WOMAN WITH SWAG — CART + WHATSAPP CHECKOUT
   Drop this file in as <script src="cart.js" defer></script>
   after your style.css link. It injects its own markup
   and styles, so no HTML changes are needed beyond wiring
   up your "Add to Cart" buttons (see bottom of this file).
===================================================== */

(function () {
  "use strict";

  /* -----------------------------------------------------
     1. CONFIG — set your WhatsApp business number here.
        Country code + number, digits only, no + or leading 0.
        e.g. Nigeria 0803 123 4567  ->  "2348031234567"
  ----------------------------------------------------- */
  const WHATSAPP_NUMBER = "2348147714754"; // TODO: replace with real number

  const STORAGE_KEY = "mwws_cart";

  /* -----------------------------------------------------
     2. STATE — load any saved cart from localStorage
  ----------------------------------------------------- */
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage unavailable — cart still works for this session */
    }
  }

  /* -----------------------------------------------------
     3. PUBLIC API — call this from your Add to Cart buttons
        window.addToCart(name, price, size, image, qty)

        name  (string)  required
        price (number)  required — numeric value, e.g. 35000
        size  (string)  optional — e.g. "M", "UK 6", null if n/a
        image (string)  optional — image src shown in the cart
        qty   (number)  optional — defaults to 1
  ----------------------------------------------------- */
  function addToCart(name, price, size = null, image = "", qty = 1) {
    if (!name || typeof price !== "number") {
      console.warn("addToCart: name and numeric price are required");
      return;
    }

    const existing = cart.find(
      (item) => item.name === name && item.size === size
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ name, price, size, image, qty });
    }

    saveCart();
    renderCart();
    openCart();
    pulseIcon();
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
  }

  function changeQty(index, delta) {
    const item = cart[index];
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
    renderCart();
  }

  function cartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function formatPrice(value) {
    return "₦" + value.toLocaleString("en-NG");
  }

  /* -----------------------------------------------------
     4. UI — inject styles, cart icon, and drawer markup
  ----------------------------------------------------- */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .mwws-cart-icon {
        position: fixed;
        bottom: 1.75rem;
        right: 1.75rem;
        z-index: 999;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: none;
        background: var(--maroon, #6E1B28);
        color: var(--white, #FFFDF9);
        font-size: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 14px 30px -12px rgba(34, 24, 18, 0.5);
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .mwws-cart-icon:hover {
        background: var(--maroon-bright, #8A2A38);
        transform: translateY(-2px);
      }

      .mwws-cart-icon.pulse {
        animation: mwws-pulse 0.4s ease;
      }

      @keyframes mwws-pulse {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.18); }
        100% { transform: scale(1); }
      }

      .mwws-cart-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 999px;
        background: var(--gold, #A8824E);
        color: #221812;
        font-family: var(--font-body, sans-serif);
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .mwws-cart-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(34, 24, 18, 0.45);
        z-index: 998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
      }

      .mwws-cart-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }

      .mwws-cart-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(400px, 100vw);
        background: var(--cream-soft, #FBF7EF);
        z-index: 999;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(.4,0,.2,1);
        box-shadow: -20px 0 40px -20px rgba(34, 24, 18, 0.4);
        font-family: var(--font-body, sans-serif);
        color: var(--ink, #221812);
      }

      .mwws-cart-drawer.open {
        transform: translateX(0);
      }

      .mwws-cart-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.4rem 1.5rem;
        border-bottom: 1px solid var(--paper, #EAE0CC);
      }

      .mwws-cart-header h2 {
        font-family: var(--font-display, serif);
        font-size: 1.4rem;
        margin: 0;
      }

      .mwws-cart-close {
        background: none;
        border: none;
        font-size: 1.3rem;
        line-height: 1;
        color: var(--ink, #221812);
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        transition: background 0.2s ease;
      }

      .mwws-cart-close:hover {
        background: var(--paper, #EAE0CC);
      }

      .mwws-cart-items {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .mwws-cart-empty {
        text-align: center;
        color: var(--ink-soft, #5C4E43);
        padding: 3rem 1rem;
        font-size: 0.95rem;
      }

      .mwws-cart-item {
        display: grid;
        grid-template-columns: 56px 1fr auto;
        gap: 0.85rem;
        align-items: center;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--paper, #EAE0CC);
      }

      .mwws-cart-item img {
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 6px;
        background: var(--paper, #EAE0CC);
      }

      .mwws-cart-item-info h4 {
        margin: 0 0 0.2rem;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .mwws-cart-item-info span {
        display: block;
        font-size: 0.78rem;
        color: var(--ink-soft, #5C4E43);
      }

      .mwws-cart-item-price {
        font-family: var(--font-display, serif);
        font-weight: 700;
        color: var(--maroon-deep, #46101A);
        margin-top: 0.3rem;
        display: block;
      }

      .mwws-cart-item-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }

      .mwws-qty {
        display: flex;
        align-items: center;
        border: 1px solid var(--paper, #EAE0CC);
        border-radius: 999px;
        overflow: hidden;
      }

      .mwws-qty button {
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        font-size: 0.9rem;
        cursor: pointer;
        color: var(--maroon, #6E1B28);
      }

      .mwws-qty button:hover {
        background: var(--paper, #EAE0CC);
      }

      .mwws-qty span {
        min-width: 20px;
        text-align: center;
        font-size: 0.85rem;
      }

      .mwws-remove {
        background: none;
        border: none;
        font-size: 0.72rem;
        color: var(--ink-soft, #5C4E43);
        text-decoration: underline;
        cursor: pointer;
      }

      .mwws-remove:hover {
        color: var(--maroon, #6E1B28);
      }

      .mwws-cart-footer {
        padding: 1.3rem 1.5rem 1.6rem;
        border-top: 1px solid var(--paper, #EAE0CC);
      }

      .mwws-cart-total {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
      }

      .mwws-cart-total strong {
        font-family: var(--font-display, serif);
        font-size: 1.4rem;
        color: var(--maroon-deep, #46101A);
      }

      .mwws-checkout-btn {
        width: 100%;
        border: none;
        border-radius: 999px;
        background: var(--maroon, #6E1B28);
        color: var(--white, #FFFDF9);
        font-family: var(--font-body, sans-serif);
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: background 0.2s ease;
      }

      .mwws-checkout-btn:hover {
        background: var(--maroon-bright, #8A2A38);
      }

      .mwws-checkout-btn:disabled {
        background: var(--paper, #EAE0CC);
        color: var(--ink-soft, #5C4E43);
        cursor: not-allowed;
      }

      @media (max-width: 480px) {
        .mwws-cart-drawer {
          width: 100vw;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    const icon = document.createElement("button");
    icon.className = "mwws-cart-icon";
    icon.setAttribute("aria-label", "Open cart");
    icon.innerHTML = `🛍️<span class="mwws-cart-badge" style="display:none;">0</span>`;
    icon.addEventListener("click", openCart);
    document.body.appendChild(icon);

    const backdrop = document.createElement("div");
    backdrop.className = "mwws-cart-backdrop";
    backdrop.addEventListener("click", closeCart);
    document.body.appendChild(backdrop);

    const drawer = document.createElement("aside");
    drawer.className = "mwws-cart-drawer";
    drawer.setAttribute("aria-label", "Shopping cart");
    drawer.innerHTML = `
      <div class="mwws-cart-header">
        <h2>Your Cart</h2>
        <button class="mwws-cart-close" aria-label="Close cart">✕</button>
      </div>
      <div class="mwws-cart-items"></div>
      <div class="mwws-cart-footer">
        <div class="mwws-cart-total">
          <span>Total</span>
          <strong>₦0</strong>
        </div>
        <button class="mwws-checkout-btn">
          Checkout on WhatsApp
        </button>
      </div>
    `;
    document.body.appendChild(drawer);

    drawer.querySelector(".mwws-cart-close").addEventListener("click", closeCart);
    drawer.querySelector(".mwws-checkout-btn").addEventListener("click", checkoutOnWhatsApp);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCart();
    });
  }

  function pulseIcon() {
    const icon = document.querySelector(".mwws-cart-icon");
    if (!icon) return;
    icon.classList.remove("pulse");
    void icon.offsetWidth; // restart animation
    icon.classList.add("pulse");
  }

  function openCart() {
    document.querySelector(".mwws-cart-drawer").classList.add("open");
    document.querySelector(".mwws-cart-backdrop").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    document.querySelector(".mwws-cart-drawer").classList.remove("open");
    document.querySelector(".mwws-cart-backdrop").classList.remove("open");
    document.body.style.overflow = "";
  }

  /* -----------------------------------------------------
     5. RENDER — rebuilds the drawer contents and badge
  ----------------------------------------------------- */
  function renderCart() {
    const badge = document.querySelector(".mwws-cart-badge");
    const count = cartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";

    const itemsEl = document.querySelector(".mwws-cart-items");
    const totalEl = document.querySelector(".mwws-cart-total strong");
    const checkoutBtn = document.querySelector(".mwws-checkout-btn");

    if (cart.length === 0) {
      itemsEl.innerHTML = `<p class="mwws-cart-empty">Your cart is empty. Start adding your favourites!</p>`;
      checkoutBtn.disabled = true;
    } else {
      itemsEl.innerHTML = cart
        .map((item, index) => {
          const img = item.image || "";
          return `
            <div class="mwws-cart-item">
              <img src="${img}" alt="${item.name}" onerror="this.style.visibility='hidden'">
              <div class="mwws-cart-item-info">
                <h4>${item.name}</h4>
                ${item.size ? `<span>Size: ${item.size}</span>` : ""}
                <span class="mwws-cart-item-price">${formatPrice(item.price * item.qty)}</span>
              </div>
              <div class="mwws-cart-item-actions">
                <div class="mwws-qty">
                  <button data-action="dec" data-index="${index}" aria-label="Decrease quantity">−</button>
                  <span>${item.qty}</span>
                  <button data-action="inc" data-index="${index}" aria-label="Increase quantity">+</button>
                </div>
                <button class="mwws-remove" data-action="remove" data-index="${index}">Remove</button>
              </div>
            </div>
          `;
        })
        .join("");
      checkoutBtn.disabled = false;
    }

    totalEl.textContent = formatPrice(cartTotal());
  }

  // Event delegation for qty +/- and remove buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const action = btn.dataset.action;

    if (action === "inc") changeQty(index, 1);
    if (action === "dec") changeQty(index, -1);
    if (action === "remove") removeFromCart(index);
  });

  /* -----------------------------------------------------
     6. CHECKOUT — builds an order summary and opens WhatsApp
  ----------------------------------------------------- */
  function checkoutOnWhatsApp() {
    if (cart.length === 0) return;

    const lines = cart.map((item, i) => {
      const sizeText = item.size ? ` (Size: ${item.size})` : "";
      return `${i + 1}. ${item.name}${sizeText} x${item.qty} — ${formatPrice(item.price * item.qty)}`;
    });

    const message =
      "Hi! I'd like to order the following from Market Woman With Swag:\n\n" +
      lines.join("\n") +
      `\n\nTotal: ${formatPrice(cartTotal())}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  /* -----------------------------------------------------
     7. INIT
  ----------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    injectMarkup();
    renderCart();
  });

  // Expose the API globally so it can be wired to your buttons, e.g.:
  // <button class="cart-btn" onclick="addToCart('Statement Heels', 35000, 'M')">Add to Cart</button>
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
})();
