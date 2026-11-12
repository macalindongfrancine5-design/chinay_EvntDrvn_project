import bcrypt from "bcrypt";
import { sequelize } from "../models/db.js";
import { User } from "../models/userModel.js";

const userRoles = ["admin", "staff"];
const accountStatuses = ["active", "deactivated"];

function readUserForm(body, { requirePassword = false } = {}) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "staff");
  const accountStatus = String(body.accountStatus || "active");

  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a name and a valid email address." };
  }
  if (!userRoles.includes(role)) return { error: "Choose Admin or Staff." };
  if (!accountStatuses.includes(accountStatus)) return { error: "Choose a valid account status." };
  if ((requirePassword || password) && (password.length < 8 || password.length > 72)) {
    return { error: "Passwords must be between 8 and 72 characters." };
  }
  return { value: { name, email, password, role, accountStatus } };
}

function mapUser(user, currentUserId) {
  const item = user.get({ plain: true });
  item.isCurrentUser = String(user.id) === String(currentUserId);
  item.roleIsAdmin = user.role === "admin";
  item.roleIsStaff = user.role === "staff";
  item.statusIsActive = user.accountStatus === "active";
  item.statusLabel = item.statusIsActive ? "Active" : "Deactivated";
  item.statusBadgeClass = item.statusIsActive ? "badge-green" : "badge-red";
  item.createdDate = new Date(user.createdAt).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  item.initial = user.name.trim().charAt(0).toUpperCase() || "U";
  return item;
}

export const usersPage = async (req, res) => {
  try {
    const allUsers = await User.findAll({
      attributes: ["id", "name", "email", "role", "accountStatus", "createdAt"],
      order: [["name", "ASC"]]
    });
    const search = String(req.query.search || "").trim().slice(0, 100);
    const roleFilter = userRoles.includes(String(req.query.role || "")) ? String(req.query.role) : "";
    const statusFilter = accountStatuses.includes(String(req.query.status || "")) ? String(req.query.status) : "";
    const sort = ["name_asc", "name_desc", "newest", "oldest"].includes(String(req.query.sort || ""))
      ? String(req.query.sort)
      : "name_asc";
    const sorters = {
      name_asc: (a, b) => a.name.localeCompare(b.name),
      name_desc: (a, b) => b.name.localeCompare(a.name),
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    };
    const users = allUsers.map((user) => mapUser(user, req.session.userId));
    const filteredUsers = users.filter((user) => {
      const matchesSearch = !search
        || `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch
        && (!roleFilter || user.role === roleFilter)
        && (!statusFilter || user.accountStatus === statusFilter);
    }).sort(sorters[sort]);

    res.render("users", {
      title: "User management",
      pageTitle: "User management",
      displayName: req.session.userName || "StockTrack admin",
      isUserManagement: true,
      isAdmin: true,
      users: filteredUsers,
      hasUsers: allUsers.length > 0,
      hasFilteredUsers: filteredUsers.length > 0,
      totalUsers: allUsers.length,
      activeCount: allUsers.filter((user) => user.accountStatus === "active").length,
      adminCount: allUsers.filter((user) => user.role === "admin").length,
      staffCount: allUsers.filter((user) => user.role === "staff").length,
      deactivatedCount: allUsers.filter((user) => user.accountStatus === "deactivated").length,
      search,
      roleFilter,
      statusFilter,
      roleIsAdmin: roleFilter === "admin",
      roleIsStaff: roleFilter === "staff",
      statusFilterActive: statusFilter === "active",
      statusFilterDeactivated: statusFilter === "deactivated",
      sortIsNameAsc: sort === "name_asc",
      sortIsNameDesc: sort === "name_desc",
      sortIsNewest: sort === "newest",
      sortIsOldest: sort === "oldest"
    });
  } catch (error) {
    console.error("Failed to load StockTrack users:", error);
    req.flash("error_msg", "Could not load users. Please try again.");
    res.status(500).render("users", {
      title: "User management",
      pageTitle: "User management",
      displayName: req.session.userName || "StockTrack admin",
      isUserManagement: true,
      isAdmin: true,
      users: [],
      hasUsers: false,
      hasFilteredUsers: false,
      totalUsers: 0,
      activeCount: 0,
      adminCount: 0,
      staffCount: 0,
      deactivatedCount: 0,
      error_msg: ["Could not load users. Please try again."]
    });
  }
};

export const createUser = async (req, res) => {
  const input = readUserForm(req.body, { requirePassword: true });
  if (input.error) {
    req.flash("error_msg", input.error);
    return res.redirect("/users");
  }

  try {
    await User.create({
      name: input.value.name,
      email: input.value.email,
      role: input.value.role,
      accountStatus: input.value.accountStatus,
      password: await bcrypt.hash(input.value.password, 10)
    });
    req.flash("success_msg", "Account created.");
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      req.flash("error_msg", "An account with that email already exists.");
    } else {
      console.error("Failed to create a StockTrack user:", error);
      req.flash("error_msg", "Could not create the account. Please try again.");
    }
  }
  res.redirect("/users");
};

export const updateUser = async (req, res) => {
  const input = readUserForm(req.body);
  if (input.error) {
    req.flash("error_msg", input.error);
    return res.redirect("/users");
  }

  try {
    const updatedUser = await sequelize.transaction(async (transaction) => {
      const administrators = await User.findAll({
        where: { role: "admin", accountStatus: "active" },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const user = await User.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.role === "admin" && user.accountStatus === "active"
          && (input.value.role !== "admin" || input.value.accountStatus !== "active")
          && administrators.length <= 1) {
        throw new Error("LAST_ADMIN");
      }

      await user.update(input.value, { transaction, fields: ["name", "email", "role", "accountStatus"] });
      return user;
    });

    const isCurrentUser = String(updatedUser.id) === String(req.session.userId);
    if (isCurrentUser) {
      req.session.userName = updatedUser.name;
      req.session.userRole = updatedUser.role;
    }
    req.flash("success_msg", "Account updated.");
    if (isCurrentUser && updatedUser.role !== "admin") {
      return res.redirect("/inventory");
    }
    if (isCurrentUser && updatedUser.accountStatus !== "active") {
      return req.session.destroy((error) => {
        if (error) {
          console.error("Failed to end a deactivated StockTrack session:", error);
          return res.status(500).send("Account updated, but the session could not be ended.");
        }
        res.redirect("/login?deactivated=1");
      });
    }
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      req.flash("error_msg", "That account could not be found.");
    } else if (error.message === "LAST_ADMIN") {
      req.flash("error_msg", "At least one active administrator must remain.");
    } else if (error.name === "SequelizeUniqueConstraintError") {
      req.flash("error_msg", "An account with that email already exists.");
    } else {
      console.error("Failed to update a StockTrack user:", error);
      req.flash("error_msg", "Could not update the account. Please try again.");
    }
  }
  res.redirect("/users");
};

export const deleteUser = async (req, res) => {
  if (String(req.params.id) === String(req.session.userId)) {
    req.flash("error_msg", "You cannot delete the account you are currently using.");
    return res.redirect("/users");
  }

  try {
    await sequelize.transaction(async (transaction) => {
      const administrators = await User.findAll({
        where: { role: "admin", accountStatus: "active" },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const user = await User.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.role === "admin" && user.accountStatus === "active" && administrators.length <= 1) {
        throw new Error("LAST_ADMIN");
      }
      await user.destroy({ transaction });
    });
    req.flash("success_msg", "Account deleted.");
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      req.flash("error_msg", "That account could not be found.");
    } else if (error.message === "LAST_ADMIN") {
      req.flash("error_msg", "The last active administrator cannot be deleted.");
    } else {
      console.error("Failed to delete a StockTrack user:", error);
      req.flash("error_msg", "Could not delete the account. Please try again.");
    }
  }
  res.redirect("/users");
};

export const resetUserPassword = async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 8 || password.length > 72) {
    req.flash("error_msg", "Enter a temporary password between 8 and 72 characters.");
    return res.redirect("/users");
  }

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash("error_msg", "That account could not be found.");
      return res.redirect("/users");
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    req.flash("success_msg", `Password reset for ${user.name}.`);
  } catch (error) {
    console.error("Failed to reset a StockTrack user password:", error);
    req.flash("error_msg", "Could not reset the password. Please try again.");
  }
  res.redirect("/users");
};
