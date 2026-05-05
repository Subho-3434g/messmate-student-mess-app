/**
 * Role-Based UI Module
 * Handles UI visibility and permissions based on user roles
 */

const roleBasedUI = {
  // Current user role
  currentRole: null,

  // Initialize role-based UI
  init() {
    window.addEventListener("messcloud-user", () => this.updateUI());
    this.updateUI();
  },

  // Update UI based on current user role
  updateUI() {
    const cloud = window.MessCloud;
    const role = cloud?.getUserRole?.();
    this.currentRole = role;

    this.updateNavigationUI(role);
    this.updateFormPermissions(role);
    this.updateTableActions(role);
    this.updateAdminPanel(role);
  },

  // Show/hide navigation items based on role
  updateNavigationUI(role) {
    const adminNav = document.querySelector('[data-view="admin"]');
    
    if (adminNav) {
      // Only show admin panel to admins
      adminNav.style.display = role === "admin" ? "block" : "none";
    }

    // Show/hide based on role
    const studentOnlyElements = document.querySelectorAll("[data-role='student-only']");
    const managerOnlyElements = document.querySelectorAll("[data-role='manager-only']");
    const adminOnlyElements = document.querySelectorAll("[data-role='admin-only']");

    studentOnlyElements.forEach(el => {
      el.style.display = role === "student" ? "block" : "none";
    });

    managerOnlyElements.forEach(el => {
      el.style.display = role === "manager" ? "block" : "none";
    });

    adminOnlyElements.forEach(el => {
      el.style.display = role === "admin" ? "block" : "none";
    });
  },

  // Disable/enable forms based on role
  updateFormPermissions(role) {
    const editForms = [
      "#residentForm",
      "#mealForm",
      "#purchaseForm",
      "#menuForm",
      "#paymentForm"
    ];

    const isReadOnly = role === "student";

    editForms.forEach(selector => {
      const form = document.querySelector(selector);
      if (form) {
        const inputs = form.querySelectorAll("input, select, textarea, button[type='submit']");
        inputs.forEach(input => {
          if (input.type === "submit") {
            input.disabled = isReadOnly;
            input.style.opacity = isReadOnly ? "0.5" : "1";
          } else {
            input.disabled = isReadOnly;
          }
        });

        if (isReadOnly) {
          form.style.opacity = "0.6";
          form.style.pointerEvents = "none";
        } else {
          form.style.opacity = "1";
          form.style.pointerEvents = "auto";
        }
      }
    });

    // Show message for students
    if (isReadOnly) {
      const message = document.querySelector("[data-role='student-message']");
      if (!message) {
        const msg = document.createElement("div");
        msg.setAttribute("data-role", "student-message");
        msg.className = "info-banner";
        msg.textContent = "📖 You have read-only access. Contact an admin to edit data.";
        msg.style.cssText = "padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; margin-bottom: 16px; border-radius: 4px;";
        
        const mainContent = document.querySelector("main");
        if (mainContent) {
          mainContent.insertBefore(msg, mainContent.firstChild);
        }
      }
    } else {
      const message = document.querySelector("[data-role='student-message']");
      if (message) {
        message.remove();
      }
    }
  },

  // Disable/enable table actions based on role
  updateTableActions(role) {
    const isReadOnly = role === "student";
    const deleteButtons = document.querySelectorAll("button[data-action*='delete']");
    const editButtons = document.querySelectorAll("button[data-action*='toggle']");

    deleteButtons.forEach(btn => {
      btn.disabled = isReadOnly;
      btn.style.opacity = isReadOnly ? "0.5" : "1";
    });

    editButtons.forEach(btn => {
      btn.disabled = isReadOnly;
      btn.style.opacity = isReadOnly ? "0.5" : "1";
    });
  },

  // Show/hide admin panel sections
  updateAdminPanel(role) {
    const adminSection = document.querySelector("#admin");
    if (adminSection) {
      adminSection.style.display = role === "admin" ? "block" : "none";
    }

    // Add role badge
    const roleBadge = document.querySelector("[data-role='badge']");
    if (roleBadge) {
      const roleText = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest";
      roleBadge.textContent = `Role: ${roleText}`;
      roleBadge.className = `role-badge role-${role}`;
    }
  },

  // Check if user has permission for an action
  hasPermission(action, role = this.currentRole) {
    const permissions = {
      admin: ["read", "write", "delete", "manage-users", "grant-access"],
      manager: ["read", "write", "delete"],
      student: ["read"]
    };

    return permissions[role]?.includes(action) || false;
  },

  // Check if user can edit a specific mess
  canEditMess(messId) {
    const cloud = window.MessCloud;
    const role = cloud?.getUserRole?.();

    if (role === "admin") return true;
    if (role === "manager") {
      // Check if manager has access for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      // This would require checking managerAccess collection
      return true; // Simplified - actual check in cloud.js
    }
    if (role === "student") return false;

    return false;
  },

  // Show role-specific help message
  showRoleHelp() {
    const role = this.currentRole;
    const helpMessages = {
      admin: "You have full access. You can manage users, create messes, and grant manager access.",
      manager: "You can edit mess data for the months you have access to. Contact an admin to extend your access.",
      student: "You have read-only access. You can view mess data but cannot make changes."
    };

    const message = helpMessages[role] || "Welcome to MessMate";
    console.log(`[${role.toUpperCase()}] ${message}`);
  }
};

// Initialize role-based UI when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => roleBasedUI.init());
} else {
  roleBasedUI.init();
}
