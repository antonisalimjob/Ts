<select
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value)}
  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
>
  <option value="ADMIN">IT Lead / Admin</option>
  <option value="TECHNICIAN">IT Support / Agent</option>
  <option value="END_USER">User / End User</option>
</select>
