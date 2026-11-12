const productModal = document.querySelector("#product-modal");
const productForm = document.querySelector("#product-form");

document.querySelectorAll("[data-open-product]").forEach((button) => {
  button.addEventListener("click", () => {
    productForm.reset();
    productForm.action = "/products";
    productForm.elements.quantity.disabled = false;
    document.querySelector(".stock-create-only").hidden = false;
    document.querySelector(".stock-edit-current").hidden = true;
    document.querySelector("#product-modal-title").textContent = "Add a product";
    document.querySelector("#product-submit").textContent = "Add product";
    productModal.showModal();
  });
});

document.querySelectorAll("[data-open-edit]").forEach((button) => {
  button.addEventListener("click", () => {
    productForm.reset();
    productForm.action = `/products/${button.dataset.id}/update`;
    productForm.elements.name.value = button.dataset.name;
    productForm.elements.category.value = button.dataset.category;
    productForm.elements.brand.value = button.dataset.brand;
    productForm.elements.barcode.value = button.dataset.barcode;
    productForm.elements.supplier.value = button.dataset.supplier;
    productForm.elements.unit.value = button.dataset.unit;
    productForm.elements.reorderLevel.value = button.dataset.reorder;
    productForm.elements.purchasePrice.value = button.dataset.purchase;
    productForm.elements.sellingPrice.value = button.dataset.selling;
    productForm.elements.expiryDate.value = button.dataset.expiry;
    productForm.elements.quantity.disabled = true;
    document.querySelector(".stock-create-only").hidden = true;
    document.querySelector("[data-current-quantity]").textContent = `${button.dataset.quantity} ${button.dataset.unit}`;
    document.querySelector(".stock-edit-current").hidden = false;
    document.querySelector("#product-modal-title").textContent = "Edit product";
    document.querySelector("#product-submit").textContent = "Save changes";
    productModal.showModal();
  });
});

const stockModal = document.querySelector("#stock-modal");
const stockForm = document.querySelector("#stock-form");

document.querySelectorAll("[data-open-stock]").forEach((button) => {
  button.addEventListener("click", () => {
    const isStockIn = button.dataset.type === "stock_in";
    stockForm.reset();
    stockForm.action = `/products/${button.dataset.id}/${button.dataset.type === "stock_in" ? "stock-in" : "stock-out"}`;
    document.querySelector("#stock-modal-title").textContent = isStockIn ? "Stock in" : "Stock out";
    document.querySelector("#stock-modal-description").textContent = isStockIn
      ? "Record newly received product quantity."
      : `Available quantity: ${button.dataset.quantity} units.`;
    document.querySelector("[data-stock-product]").textContent = button.dataset.name;
    document.querySelector("#stock-submit").textContent = isStockIn ? "Record stock in" : "Record stock out";
    stockForm.elements.quantity.max = isStockIn ? "99999999.99" : button.dataset.quantity;
    stockModal.showModal();
  });
});

const userEditModal = document.querySelector("#user-edit-modal");
const userEditForm = document.querySelector("#user-edit-form");

document.querySelectorAll("[data-open-user-edit]").forEach((button) => {
  button.addEventListener("click", () => {
    userEditForm.reset();
    userEditForm.action = `/users/${button.dataset.id}/update`;
    userEditForm.elements.name.value = button.dataset.name;
    userEditForm.elements.email.value = button.dataset.email;
    userEditForm.elements.role.value = button.dataset.role;
    userEditForm.elements.accountStatus.value = button.dataset.status;
    userEditModal.showModal();
  });
});

const userPasswordModal = document.querySelector("#user-password-modal");
const userPasswordForm = document.querySelector("#user-password-form");

document.querySelectorAll("[data-open-password-reset]").forEach((button) => {
  button.addEventListener("click", () => {
    userPasswordForm.reset();
    userPasswordForm.action = `/users/${button.dataset.id}/password`;
    document.querySelector("[data-password-user]").textContent = button.dataset.name;
    userPasswordModal.showModal();
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("dialog.modal").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});

document.querySelectorAll("[data-dismiss]").forEach((button) => {
  button.addEventListener("click", () => button.closest(".notice").remove());
});

const menuToggles = document.querySelectorAll("[data-menu-toggle]");
const sidebar = document.querySelector("#sidebar");

if (menuToggles.length && sidebar) {
  const setSidebarOpen = (isOpen) => {
    sidebar.classList.toggle("sidebar-open", isOpen);
    menuToggles.forEach((button) => {
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });
  };

  menuToggles.forEach((button) => {
    button.addEventListener("click", () => {
      setSidebarOpen(!sidebar.classList.contains("sidebar-open"));
    });
  });

  sidebar.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => setSidebarOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSidebarOpen(false);
  });
}
