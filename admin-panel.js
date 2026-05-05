/**
 * Admin Panel Module
 * Handles admin-specific operations like user role management and manager access control
 */

const adminPanel = {
  // Initialize admin panel UI
  init() {
    this.bindAdminEvents();
  },

  // Bind admin-specific event listeners
  bindAdminEvents() {
    const userRoleForm = document.querySelector("#userRoleForm");
    const managerAccessForm = document.querySelector("#managerAccessForm");
    const userListTable = document.querySelector("#userListTable");
    const managerAccessTable = document.querySelector("#managerAccessTable");

    if (userRoleForm) {
      userRoleForm.addEventListener("submit", (e) => this.handleUserRoleChange(e));
    }

    if (managerAccessForm) {
      managerAccessForm.addEventListener("submit", (e) => this.handleGrantManagerAccess(e));
    }
  },

  // Change user role (Admin only)
  async handleUserRoleChange(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = form.get("userId");
    const role = form.get("role");

    try {
      const cloud = window.MessCloud;
      if (!cloud?.isConfigured()) {
        showToast("Firebase not configured");
        return;
      }

      await cloud.setUserRole(userId, role);
      showToast(`User role updated to ${role}`);
      event.currentTarget.reset();
      await this.loadUserList();
    } catch (error) {
      showToast(error.message || "Failed to update user role");
    }
  },

  // Grant manager access for specific months (Admin only)
  async handleGrantManagerAccess(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const managerId = form.get("managerId");
    const messId = form.get("messId");
    let months = form.get("months");
    if (typeof months === "string") {
      months = months.split(",").map(m => m.trim()).filter(m => m);
    }

    if (!months || !months.length) {
      showToast("Please provide at least one month (e.g., 2024-01)");
      return;
    }

    try {
      const cloud = window.MessCloud;
      if (!cloud?.isConfigured()) {
        showToast("Firebase not configured");
        return;
      }

      await cloud.grantManagerAccess(managerId, messId, months);
      showToast(`Manager access granted for ${months.length} month(s)`);
      event.currentTarget.reset();
      await this.loadManagerAccessList(messId);
    } catch (error) {
      showToast(error.message || "Failed to grant manager access");
    }
  },

  // Revoke manager access (Admin only)
  async revokeManagerAccess(managerId, messId) {
    if (!confirm("Are you sure you want to revoke manager access?")) return;

    try {
      const cloud = window.MessCloud;
      if (!cloud?.isConfigured()) {
        showToast("Firebase not configured");
        return;
      }

      await cloud.revokeManagerAccess(managerId, messId);
      showToast("Manager access revoked");
      await this.loadManagerAccessList(messId);
    } catch (error) {
      showToast(error.message || "Failed to revoke manager access");
    }
  },

  // Load and display user list (Admin only)
  async loadUserList() {
    const userListTable = document.querySelector("#userListTable");
    if (!userListTable) return;

    try {
      const cloud = window.MessCloud;
      if (!cloud?.isConfigured() || cloud.getUserRole() !== "admin") {
        userListTable.innerHTML = `<div class="empty-state">Admin access required</div>`;
        return;
      }

      // This would typically fetch from Firestore
      // For now, showing placeholder
      userListTable.innerHTML = `
        <div class="info-box">
          User list will be loaded from Firebase Firestore.
          Implement Firestore query to fetch all users.
        </div>
      `;
    } catch (error) {
      userListTable.innerHTML = `<div class="error-state">${error.message}</div>`;
    }
  },

  // Load and display manager access list (Admin only)
  async loadManagerAccessList(messId) {
    const managerAccessTable = document.querySelector("#managerAccessTable");
    if (!managerAccessTable) return;

    try {
      const cloud = window.MessCloud;
      if (!cloud?.isConfigured() || cloud.getUserRole() !== "admin") {
        managerAccessTable.innerHTML = `<div class="empty-state">Admin access required</div>`;
        return;
      }

      const accessList = await cloud.getManagerAccessList(messId);

      if (!accessList.length) {
        managerAccessTable.innerHTML = `<div class="empty-state">No manager access records</div>`;
        return;
      }

      const rows = accessList
        .map(
          (access) => `
        <tr>
          <td>${access.managerId}</td>
          <td>${access.months.join(", ")}</td>
          <td>${new Date(access.grantedAt.toDate()).toLocaleDateString()}</td>
          <td>
            <button class="button danger" onclick="adminPanel.revokeManagerAccess('${access.managerId}', '${access.messId}')">
              Revoke
            </button>
          </td>
        </tr>
      `
        )
        .join("");

      managerAccessTable.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Manager ID</th>
              <th>Months</th>
              <th>Granted Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    } catch (error) {
      managerAccessTable.innerHTML = `<div class="error-state">${error.message}</div>`;
    }
  },
};

// Initialize admin panel when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => adminPanel.init());
} else {
  adminPanel.init();
}
